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
  if (path.toUpperCase() === 'INBOX' || special.includes('\\Inbox')) return 'inbox';
  if (special.includes('\\Sent')) return 'sent';
  if (special.includes('\\Drafts')) return 'drafts';
  if (special.includes('\\Trash')) return 'trash';
  if (special.includes('\\Junk')) return 'junk';
  if (special.includes('\\Archive')) return 'archive';
  const hay = `${path} ${listedName ?? ''}`.toLowerCase().replace(/\\/g, '/');
  const last = hay.split(/[./]/).pop() ?? hay;
  if (/(^|[./\s])(sent|gesendet|sent items|gesendete objekte)(\b|$)/i.test(hay) || last === 'sent' || last === 'gesendet') return 'sent';
  if (/(^|[./\s])(drafts|entw[uü]rfe)(\b|$)/i.test(hay) || last === 'drafts') return 'drafts';
  if (/(^|[./\s])(trash|deleted|papierkorb|deleted items|papierkorb)(\b|$)/i.test(hay) || last === 'trash' || last === 'papierkorb') return 'trash';
  if (/(^|[./\s])(junk|spam)(\b|$)/i.test(hay) || last === 'junk' || last === 'spam') return 'junk';
  if (/(^|[./\s])(archive|archiv)(\b|$)/i.test(hay) || last === 'archive' || last === 'archiv') return 'archive';
  return 'other';
}
