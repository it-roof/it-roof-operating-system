import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mailboxFolder, mailboxMessage } from '@/lib/schema';
import { getMailboxCredentials } from '@/lib/mail/mailbox';
import { withImap } from '@/lib/mail/imap';
import { snippetFrom, stringifyAddressList, threadIdFromHeaders } from '@/lib/mail/thread';

type Addr = { name?: string | null; address: string };

function formatAddr(a: Addr) {
  return a.name ? `"${a.name}" <${a.address}>` : a.address;
}

export async function sendMail(opts: {
  mailboxId: string;
  userId: string;
  to: Addr[];
  cc?: Addr[];
  subject: string;
  text: string;
  inReplyTo?: string | null;
  references?: string | null;
  draftId?: string | null;
}) {
  const creds = await getMailboxCredentials(opts.mailboxId, opts.userId);
  if (!creds) throw new Error('Postfach nicht gefunden');
  if (!opts.to.length) throw new Error('Empfänger fehlt');

  const from = creds.displayName ? `"${creds.displayName}" <${creds.email}>` : creds.email;
  const mailOpts = {
    from,
    to: opts.to.map(formatAddr),
    cc: opts.cc?.length ? opts.cc.map(formatAddr) : undefined,
    subject: opts.subject,
    text: opts.text,
    inReplyTo: opts.inReplyTo ?? undefined,
    references: opts.references ?? undefined,
    date: new Date(),
  };

  const raw: Buffer = await new MailComposer(mailOpts).compile().build();

  const transporter = nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: creds.smtpSecure || creds.smtpPort === 465,
    auth: { user: creds.username, pass: creds.password },
    requireTLS: !creds.smtpSecure && creds.smtpPort !== 465,
  });

  const envelopeTo = [
    ...opts.to.map(a => a.address),
    ...(opts.cc ?? []).map(a => a.address),
  ];
  const info = await transporter.sendMail({
    envelope: { from: creds.email, to: envelopeTo },
    raw,
  });

  const sentFolder = (await db
    .select()
    .from(mailboxFolder)
    .where(and(eq(mailboxFolder.mailboxId, creds.id), eq(mailboxFolder.role, 'sent'))))[0] ?? null;

  let uid: number | null = null;
  if (sentFolder) {
    try {
      await withImap(creds, async client => {
        const appended = await client.append(sentFolder.imapPath, raw, ['\\Seen']);
        if (appended && typeof appended === 'object' && 'uid' in appended && appended.uid != null) {
          uid = Number(appended.uid);
        }
      });
    } catch {
      // Mail ist schon raus — Gesendet-Kopie folgt beim Sync
    }

    const messageId = typeof info.messageId === 'string' ? info.messageId : null;
    await db.insert(mailboxMessage).values({
      mailboxId: creds.id,
      folderId: sentFolder.id,
      uid,
      messageIdHeader: messageId,
      inReplyTo: opts.inReplyTo ?? null,
      referencesHeader: opts.references ?? null,
      threadId: threadIdFromHeaders(messageId, opts.inReplyTo, opts.references),
      fromName: creds.displayName,
      fromAddress: creds.email,
      toAddresses: stringifyAddressList(opts.to),
      ccAddresses: stringifyAddressList(opts.cc),
      subject: opts.subject || '(Kein Betreff)',
      date: new Date(),
      seen: true,
      flagged: false,
      draft: false,
      answered: false,
      snippet: snippetFrom(opts.text, null),
      textBody: opts.text,
      htmlBody: null,
      hasAttachments: false,
      size: raw.length,
    });
  }

  if (opts.draftId) {
    await db.delete(mailboxMessage).where(and(
      eq(mailboxMessage.id, opts.draftId),
      eq(mailboxMessage.mailboxId, creds.id),
    ));
  }

  return { messageId: info.messageId as string | undefined };
}

export async function saveDraft(opts: {
  mailboxId: string;
  userId: string;
  draftId?: string | null;
  to: Addr[];
  cc?: Addr[];
  subject: string;
  text: string;
  inReplyTo?: string | null;
  references?: string | null;
}) {
  const creds = await getMailboxCredentials(opts.mailboxId, opts.userId);
  if (!creds) throw new Error('Postfach nicht gefunden');

  let drafts = (await db
    .select()
    .from(mailboxFolder)
    .where(and(eq(mailboxFolder.mailboxId, creds.id), eq(mailboxFolder.role, 'drafts'))))[0];

  if (!drafts) {
    const [created] = await db
      .insert(mailboxFolder)
      .values({
        mailboxId: creds.id,
        imapPath: '__local_drafts__',
        name: 'Entwürfe',
        role: 'drafts',
      })
      .returning();
    drafts = created!;
  }

  const values = {
    mailboxId: creds.id,
    folderId: drafts.id,
    uid: null as number | null,
    messageIdHeader: null as string | null,
    inReplyTo: opts.inReplyTo ?? null,
    referencesHeader: opts.references ?? null,
    threadId: threadIdFromHeaders(null, opts.inReplyTo ?? null, opts.references ?? null),
    fromName: creds.displayName,
    fromAddress: creds.email,
    toAddresses: stringifyAddressList(opts.to),
    ccAddresses: stringifyAddressList(opts.cc),
    subject: opts.subject || '(Kein Betreff)',
    date: new Date(),
    seen: true,
    flagged: false,
    draft: true,
    answered: false,
    snippet: opts.text.slice(0, 180) || null,
    textBody: opts.text,
    htmlBody: null as string | null,
    hasAttachments: false,
    size: opts.text.length,
    updatedAt: new Date(),
  };

  if (opts.draftId) {
    const [row] = await db
      .update(mailboxMessage)
      .set(values)
      .where(and(eq(mailboxMessage.id, opts.draftId), eq(mailboxMessage.mailboxId, creds.id)))
      .returning({ id: mailboxMessage.id });
    if (row) return row;
  }

  const [row] = await db.insert(mailboxMessage).values(values).returning({ id: mailboxMessage.id });
  return row!;
}
