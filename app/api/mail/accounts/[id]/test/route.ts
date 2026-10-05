import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { getMailboxForUser } from '@/lib/mail/mailbox';
import { decryptSecret } from '@/lib/crypto/secret-box';
import { testMailboxConnection } from '@/lib/mail/imap';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const row = await getMailboxForUser(id, session.user.id);
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  try {
    await testMailboxConnection({
      imapHost: row.imapHost,
      imapPort: row.imapPort,
      imapSecure: row.imapSecure,
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpSecure: row.smtpSecure,
      username: row.username,
      password: decryptSecret(row.passwordEncrypted),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verbindung fehlgeschlagen';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
