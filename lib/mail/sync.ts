import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { simpleParser, type AddressObject, type Attachment } from 'mailparser';
import { db } from '@/lib/db';
import { mailbox, mailboxAttachment, mailboxFolder, mailboxMessage } from '@/lib/schema';
import { getMailboxCredentials, type MailboxCredentials } from '@/lib/mail/mailbox';
import { folderRole, withImap } from '@/lib/mail/imap';
import { snippetFrom, stringifyAddressList, threadIdFromHeaders } from '@/lib/mail/thread';

const SYNC_DAYS = 90;
const MAX_FETCH = 400;
const MAX_HTML = 400_000;
const MAX_TEXT = 200_000;
const MAX_ATTACH = 4 * 1024 * 1024;
const MAX_ATTACH_COUNT = 8;

function toDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function clip(s: string | null | undefined, max: number) {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function addrs(obj: AddressObject | AddressObject[] | undefined) {
  const list = !obj ? [] : Array.isArray(obj) ? obj : [obj];
  const out: { name: string | null; address: string }[] = [];
  for (const item of list) {
    for (const v of item.value ?? []) {
      if (v.address) out.push({ name: v.name || null, address: v.address });
    }
  }
  return out;
}

function flagsOf(flags: Set<string> | string[] | undefined) {
  const set = flags instanceof Set ? flags : new Set(flags ?? []);
  const has = (name: string) => set.has(name) || set.has(name.toLowerCase());
  return {
    seen: has('\\Seen') || has('Seen'),
    flagged: has('\\Flagged') || has('Flagged'),
    draft: has('\\Draft') || has('Draft'),
    answered: has('\\Answered') || has('Answered'),
  };
}

export async function syncMailbox(mailboxId: string, userId?: string) {
  const creds = await getMailboxCredentials(mailboxId, userId);
  if (!creds) throw new Error('Postfach nicht gefunden');

  try {
    const result = await withImap(creds, client => runSync(creds, client));
    await db
      .update(mailbox)
      .set({ lastSyncAt: new Date(), lastSyncError: null, updatedAt: new Date() })
      .where(eq(mailbox.id, mailboxId));
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync fehlgeschlagen';
    await db
      .update(mailbox)
      .set({ lastSyncError: message.slice(0, 500), updatedAt: new Date() })
      .where(eq(mailbox.id, mailboxId));
    throw err;
  }
}

export async function syncAllMailboxes(userId?: string) {
  const rows = userId
    ? await db.select({ id: mailbox.id }).from(mailbox).where(eq(mailbox.userId, userId))
    : await db.select({ id: mailbox.id }).from(mailbox);
  const errors: string[] = [];
  let synced = 0;
  for (const row of rows) {
    try {
      await syncMailbox(row.id, userId);
      synced += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'unbekannt');
    }
  }
  return { synced, errors };
}

async function runSync(creds: MailboxCredentials, client: Awaited<ReturnType<typeof import('@/lib/mail/imap').createImapClient>>) {
  const listed = await client.list();
  const since = new Date(Date.now() - SYNC_DAYS * 24 * 60 * 60 * 1000);
  let stored = 0;

  const existingFolders = await db
    .select()
    .from(mailboxFolder)
    .where(eq(mailboxFolder.mailboxId, creds.id));
  const folderByPath = new Map(existingFolders.map(f => [f.imapPath, f]));

  for (const box of listed) {
    if (box.flags.has('\\Noselect') || box.flags.has('\\NonExistent')) continue;
    const path = box.path;
    const name = box.name || path.split(/[./]/).pop() || path;
    const role = folderRole(path, box.specialUse, name);
    let folder = folderByPath.get(path);
    if (!folder) {
      const [created] = await db
        .insert(mailboxFolder)
        .values({
          mailboxId: creds.id,
          imapPath: path,
          name,
          role,
        })
        .returning();
      folder = created!;
      folderByPath.set(path, folder);
    } else if (folder.role !== role || folder.name !== name) {
      await db.update(mailboxFolder).set({ name, role }).where(eq(mailboxFolder.id, folder.id));
      folder = { ...folder, name, role };
    }

    const lock = await client.getMailboxLock(path);
    try {
      const mb = client.mailbox;
      const uidValidity = mb && 'uidValidity' in mb && mb.uidValidity != null
        ? Number(mb.uidValidity)
        : null;

      if (uidValidity != null && folder.uidValidity != null && folder.uidValidity !== uidValidity) {
        await db.delete(mailboxMessage).where(eq(mailboxMessage.folderId, folder.id));
      }
      if (uidValidity != null && folder.uidValidity !== uidValidity) {
        await db.update(mailboxFolder).set({ uidValidity }).where(eq(mailboxFolder.id, folder.id));
      }

      const searched = await client.search({ since }, { uid: true });
      const uids = (Array.isArray(searched) ? searched : [])
        .map(u => Number(u))
        .filter(n => Number.isFinite(n))
        .sort((a, b) => b - a)
        .slice(0, MAX_FETCH);

      if (uids.length === 0) continue;

      const known = await db
        .select({ id: mailboxMessage.id, uid: mailboxMessage.uid })
        .from(mailboxMessage)
        .where(and(eq(mailboxMessage.folderId, folder.id), isNotNull(mailboxMessage.uid)));
      const knownByUid = new Map(known.filter(k => k.uid != null).map(k => [k.uid!, k.id]));
      const seenUids = new Set<number>();

      for await (const msg of client.fetch(uids, {
        uid: true,
        flags: true,
        envelope: true,
        source: true,
      }, { uid: true })) {
        const uid = Number(msg.uid);
        if (!Number.isFinite(uid)) continue;
        seenUids.add(uid);
        const existingId = knownByUid.get(uid);
        const fl = flagsOf(msg.flags);

        if (existingId) {
          await db
            .update(mailboxMessage)
            .set({
              seen: fl.seen,
              flagged: fl.flagged,
              draft: fl.draft,
              answered: fl.answered,
              updatedAt: new Date(),
            })
            .where(eq(mailboxMessage.id, existingId));
          continue;
        }

        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const from = addrs(parsed.from)[0];
        const to = addrs(parsed.to);
        const cc = addrs(parsed.cc);
        const messageId = parsed.messageId ?? msg.envelope?.messageId ?? null;
        const inReplyTo = parsed.inReplyTo ?? null;
        const references = Array.isArray(parsed.references)
          ? parsed.references.join(' ')
          : (parsed.references ?? null);
        const html = clip(typeof parsed.html === 'string' ? parsed.html : null, MAX_HTML);
        const text = clip(parsed.text ?? null, MAX_TEXT);
        const attachments = (parsed.attachments ?? []).filter(a => !a.related);
        const kept = attachments.filter(a => (a.size ?? a.content?.length ?? 0) <= MAX_ATTACH).slice(0, MAX_ATTACH_COUNT);

        const [row] = await db
          .insert(mailboxMessage)
          .values({
            mailboxId: creds.id,
            folderId: folder.id,
            uid,
            messageIdHeader: messageId,
            inReplyTo,
            referencesHeader: references,
            threadId: threadIdFromHeaders(messageId, inReplyTo, references),
            fromName: from?.name ?? null,
            fromAddress: from?.address ?? null,
            toAddresses: stringifyAddressList(to),
            ccAddresses: stringifyAddressList(cc),
            subject: parsed.subject ?? msg.envelope?.subject ?? null,
            date: toDate(parsed.date ?? msg.envelope?.date),
            seen: fl.seen,
            flagged: fl.flagged,
            draft: fl.draft,
            answered: fl.answered,
            snippet: snippetFrom(text, html),
            textBody: text,
            htmlBody: html,
            hasAttachments: kept.length > 0,
            size: msg.source.length,
          })
          .returning({ id: mailboxMessage.id });

        if (row && kept.length) {
          await insertAttachments(row.id, kept);
        }
        stored += 1;
      }

      const stale = known.filter(k => k.uid != null && !seenUids.has(k.uid) && uids.includes(k.uid));
      if (stale.length) {
        await db.delete(mailboxMessage).where(inArray(mailboxMessage.id, stale.map(s => s.id)));
      }
    } finally {
      lock.release();
    }
  }

  return { folders: listed.length, stored };
}

async function insertAttachments(messageId: string, files: Attachment[]) {
  for (const file of files) {
    const buffer = toBuffer(file.content);
    if (!buffer || buffer.length > MAX_ATTACH) continue;
    await db.insert(mailboxAttachment).values({
      messageId,
      filename: file.filename ?? null,
      contentType: file.contentType ?? 'application/octet-stream',
      size: buffer.length,
      contentBase64: buffer.toString('base64'),
    });
  }
}

function toBuffer(content: unknown): Buffer | null {
  if (!content) return null;
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  if (typeof content === 'string') return Buffer.from(content);
  return null;
}
