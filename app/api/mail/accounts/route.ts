import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { writeAudit } from '@/lib/auth/audit';
import { db } from '@/lib/db';
import { mailbox } from '@/lib/schema';
import { encryptSecret, listMailboxes, mailboxToPublic } from '@/lib/mail/mailbox';
import { testMailboxConnection } from '@/lib/mail/imap';
import { guessMailHosts } from '@/lib/mail/guess-host';

export const runtime = 'nodejs';

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  const rows = await listMailboxes(session.user.id);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const body = await req.json() as {
    email?: string;
    display_name?: string;
    imap_host?: string;
    imap_port?: number;
    imap_secure?: boolean;
    smtp_host?: string;
    smtp_port?: number;
    smtp_secure?: boolean;
    username?: string;
    password?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? '';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'E-Mail-Adresse fehlt' }, { status: 400 });
  }
  const guessed = guessMailHosts(email);
  let imapHost = body.imap_host?.trim() || guessed.imapHost;
  let smtpHost = body.smtp_host?.trim() || guessed.smtpHost;
  const username = body.username?.trim() || email;
  const password = body.password ?? '';
  if (!imapHost || !smtpHost || !password) {
    return NextResponse.json({ error: 'Host und Passwort sind nötig' }, { status: 400 });
  }
  let imapPort = Number(body.imap_port) || guessed.imapPort;
  let smtpPort = Number(body.smtp_port) || guessed.smtpPort;
  let imapSecure = body.imap_secure ?? guessed.imapSecure;
  let smtpSecure = body.smtp_secure ?? guessed.smtpSecure;

  try {
    await testMailboxConnection({
      imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure, username, password,
    });
  } catch (err) {
    const domain = email.split('@')[1] ?? '';
    const genericGuess = imapHost === `imap.${domain}` || smtpHost === `smtp.${domain}`;
    if (genericGuess && domain && domain !== 'kasserver.com') {
      try {
        await testMailboxConnection({
          imapHost: 'imap.kasserver.com',
          imapPort: 993,
          imapSecure: true,
          smtpHost: 'smtp.kasserver.com',
          smtpPort: 587,
          smtpSecure: false,
          username,
          password,
        });
        imapHost = 'imap.kasserver.com';
        smtpHost = 'smtp.kasserver.com';
        imapPort = 993;
        imapSecure = true;
        smtpPort = 587;
        smtpSecure = false;
      } catch {
        const message = err instanceof Error ? err.message : 'Verbindung fehlgeschlagen';
        return NextResponse.json({ error: `Konto nicht erreichbar: ${message}` }, { status: 400 });
      }
    } else {
      const message = err instanceof Error ? err.message : 'Verbindung fehlgeschlagen';
      return NextResponse.json({ error: `Konto nicht erreichbar: ${message}` }, { status: 400 });
    }
  }

  try {
    const [row] = await db
      .insert(mailbox)
      .values({
        userId: session.user.id,
        email,
        displayName: body.display_name?.trim() || null,
        imapHost,
        imapPort,
        imapSecure,
        smtpHost,
        smtpPort,
        smtpSecure,
        username,
        passwordEncrypted: encryptSecret(password),
      })
      .returning();
    await writeAudit({ action: 'mailbox.create', resource: 'mailbox', resourceId: row!.id });
    return NextResponse.json(mailboxToPublic(row!));
  } catch {
    return NextResponse.json({ error: 'Dieses Konto ist bereits verbunden' }, { status: 409 });
  }
}
