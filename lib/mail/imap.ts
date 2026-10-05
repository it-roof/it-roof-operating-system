import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import type { MailboxCredentials } from '@/lib/mail/mailbox';

export function createImapClient(box: MailboxCredentials) {
  return new ImapFlow({
    host: box.imapHost,
    port: box.imapPort,
    secure: box.imapSecure,
    auth: { user: box.username, pass: box.password },
    logger: false,
  });
}

export async function withImap<T>(box: MailboxCredentials, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = createImapClient(box);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

export async function testMailboxConnection(input: {
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  password: string;
}) {
  const client = new ImapFlow({
    host: input.imapHost,
    port: input.imapPort,
    secure: input.imapSecure,
    auth: { user: input.username, pass: input.password },
    logger: false,
  });
  await client.connect();
  await client.logout().catch(() => client.close());

  const transporter = nodemailer.createTransport({
    host: input.smtpHost,
    port: input.smtpPort,
    secure: input.smtpSecure || input.smtpPort === 465,
    auth: { user: input.username, pass: input.password },
    requireTLS: !input.smtpSecure && input.smtpPort !== 465,
  });
  await transporter.verify();
}

export function folderRole(path: string, specialUse?: string | string[] | null, listedName?: string) {
  const special = Array.isArray(specialUse) ? specialUse.join(' ') : (specialUse ?? '');
  const hay = `${path} ${listedName ?? ''} ${special}`.toLowerCase();
  if (path.toUpperCase() === 'INBOX' || special.includes('\\Inbox')) return 'inbox';
  if (special.includes('\\Sent') || /(^|\/)(sent|gesendet|sent items)/i.test(hay)) return 'sent';
  if (special.includes('\\Drafts') || /(^|\/)(drafts|entw[uü]rfe)/i.test(hay)) return 'drafts';
  if (special.includes('\\Trash') || /(^|\/)(trash|deleted|papierkorb|deleted items)/i.test(hay)) return 'trash';
  if (special.includes('\\Junk') || /(^|\/)(junk|spam)/i.test(hay)) return 'junk';
  if (special.includes('\\Archive') || /(^|\/)(archive|archiv)/i.test(hay)) return 'archive';
  return 'other';
}
