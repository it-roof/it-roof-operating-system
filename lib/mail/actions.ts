import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mailboxFolder, mailboxMessage } from '@/lib/schema';
import { getMailboxCredentials } from '@/lib/mail/mailbox';
import { withImap } from '@/lib/mail/imap';

export async function setMessageFlags(opts: {
  messageId: string;
  userId: string;
  seen?: boolean;
  flagged?: boolean;
}) {
  const msg = await loadOwnedMessage(opts.messageId, opts.userId);
  if (!msg) return null;
  const creds = await getMailboxCredentials(msg.mailboxId, opts.userId);
  if (!creds) return null;

  if (msg.uid != null) {
    await withImap(creds, async client => {
      const lock = await client.getMailboxLock(msg.imapPath);
      try {
        if (opts.seen === true) await client.messageFlagsAdd(msg.uid!, ['\\Seen'], { uid: true });
        if (opts.seen === false) await client.messageFlagsRemove(msg.uid!, ['\\Seen'], { uid: true });
        if (opts.flagged === true) await client.messageFlagsAdd(msg.uid!, ['\\Flagged'], { uid: true });
        if (opts.flagged === false) await client.messageFlagsRemove(msg.uid!, ['\\Flagged'], { uid: true });
      } finally {
        lock.release();
      }
    });
  }

  const patch: { seen?: boolean; flagged?: boolean; updatedAt: Date } = { updatedAt: new Date() };
  if (opts.seen != null) patch.seen = opts.seen;
  if (opts.flagged != null) patch.flagged = opts.flagged;
  await db.update(mailboxMessage).set(patch).where(eq(mailboxMessage.id, msg.id));
  return true;
}

export async function deleteMessage(opts: { messageId: string; userId: string }) {
  const msg = await loadOwnedMessage(opts.messageId, opts.userId);
  if (!msg) return null;
  const creds = await getMailboxCredentials(msg.mailboxId, opts.userId);
  if (!creds) return null;

  if (msg.uid != null) {
    const trash = (await db
      .select()
      .from(mailboxFolder)
      .where(and(eq(mailboxFolder.mailboxId, msg.mailboxId), eq(mailboxFolder.role, 'trash'))))[0];

    await withImap(creds, async client => {
      const lock = await client.getMailboxLock(msg.imapPath);
      try {
        if (trash && trash.imapPath !== msg.imapPath) {
          try {
            await client.messageMove(msg.uid!, trash.imapPath, { uid: true });
          } catch {
            await client.messageDelete(msg.uid!, { uid: true });
          }
        } else {
          await client.messageDelete(msg.uid!, { uid: true });
        }
      } finally {
        lock.release();
      }
    });
  }

  await db.delete(mailboxMessage).where(eq(mailboxMessage.id, msg.id));
  return true;
}

async function loadOwnedMessage(messageId: string, userId: string) {
  const [row] = await db
    .select({
      id: mailboxMessage.id,
      uid: mailboxMessage.uid,
      mailboxId: mailboxMessage.mailboxId,
      folderId: mailboxMessage.folderId,
      imapPath: mailboxFolder.imapPath,
      userId: mailboxFolder.mailboxId,
    })
    .from(mailboxMessage)
    .innerJoin(mailboxFolder, eq(mailboxFolder.id, mailboxMessage.folderId))
    .where(eq(mailboxMessage.id, messageId))
    .limit(1);
  if (!row) return null;
  const creds = await getMailboxCredentials(row.mailboxId, userId);
  if (!creds) return null;
  return { ...row, imapPath: row.imapPath };
}
