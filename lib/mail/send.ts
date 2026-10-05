import nodemailer from 'nodemailer';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mailboxFolder, mailboxMessage } from '@/lib/schema';
import { getMailboxCredentials } from '@/lib/mail/mailbox';
import { withImap } from '@/lib/mail/imap';
import { stringifyAddressList, threadIdFromHeaders } from '@/lib/mail/thread';

type Addr = { name?: string | null; address: string };

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

  const transporter = nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: creds.smtpSecure || creds.smtpPort === 465,
    auth: { user: creds.username, pass: creds.password },
    requireTLS: !creds.smtpSecure && creds.smtpPort !== 465,
  });

  const from = creds.displayName ? `"${creds.displayName}" <${creds.email}>` : creds.email;
  const info = await transporter.sendMail({
    from,
    to: opts.to.map(a => a.name ? `"${a.name}" <${a.address}>` : a.address),
    cc: opts.cc?.length ? opts.cc.map(a => a.name ? `"${a.name}" <${a.address}>` : a.address) : undefined,
    subject: opts.subject,
    text: opts.text,
    inReplyTo: opts.inReplyTo ?? undefined,
    references: opts.references ?? undefined,
  });

  const raw = typeof info.message === 'string'
    ? Buffer.from(info.message)
    : Buffer.from(buildRaw(from, opts));

  const sentFolder = await db
    .select()
    .from(mailboxFolder)
    .where(and(eq(mailboxFolder.mailboxId, creds.id), eq(mailboxFolder.role, 'sent')))
    .then(r => r[0] ?? null);

  if (sentFolder) {
    await withImap(creds, async client => {
      try {
        await client.append(sentFolder.imapPath, raw, ['\\Seen']);
      } catch {
        // Sent-Kopie optional
      }
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

function buildRaw(from: string, opts: {
  to: Addr[];
  cc?: Addr[];
  subject: string;
  text: string;
  inReplyTo?: string | null;
  references?: string | null;
}) {
  const lines = [
    `From: ${from}`,
    `To: ${opts.to.map(a => a.address).join(', ')}`,
    opts.cc?.length ? `Cc: ${opts.cc.map(a => a.address).join(', ')}` : null,
    `Subject: ${opts.subject}`,
    opts.inReplyTo ? `In-Reply-To: ${opts.inReplyTo}` : null,
    opts.references ? `References: ${opts.references}` : null,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    opts.text,
  ].filter(line => line != null);
  return lines.join('\r\n');
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
        imapPath: 'Drafts',
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
