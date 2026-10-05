import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { writeAudit } from '@/lib/auth/audit';
import { db } from '@/lib/db';
import { mailbox } from '@/lib/schema';
import { encryptSecret, getMailboxForUser, mailboxToPublic } from '@/lib/mail/mailbox';
import { testMailboxConnection } from '@/lib/mail/imap';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const existing = await getMailboxForUser(id, session.user.id);
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const body = await req.json() as {
    display_name?: string | null;
    imap_host?: string;
    imap_port?: number;
    imap_secure?: boolean;
    smtp_host?: string;
    smtp_port?: number;
    smtp_secure?: boolean;
    username?: string;
    password?: string;
  };

  const next = {
    displayName: body.display_name === undefined ? existing.displayName : (body.display_name?.trim() || null),
    imapHost: body.imap_host?.trim() || existing.imapHost,
    imapPort: body.imap_port ?? existing.imapPort,
    imapSecure: body.imap_secure ?? existing.imapSecure,
    smtpHost: body.smtp_host?.trim() || existing.smtpHost,
    smtpPort: body.smtp_port ?? existing.smtpPort,
    smtpSecure: body.smtp_secure ?? existing.smtpSecure,
    username: body.username?.trim() || existing.username,
    passwordEncrypted: existing.passwordEncrypted,
    updatedAt: new Date(),
  };

  if (body.password) {
    try {
      await testMailboxConnection({
        imapHost: next.imapHost,
        imapPort: next.imapPort,
        imapSecure: next.imapSecure,
        smtpHost: next.smtpHost,
        smtpPort: next.smtpPort,
        smtpSecure: next.smtpSecure,
        username: next.username,
        password: body.password,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verbindung fehlgeschlagen';
      return NextResponse.json({ error: `Konto nicht erreichbar: ${message}` }, { status: 400 });
    }
    next.passwordEncrypted = encryptSecret(body.password);
  }

  const [row] = await db
    .update(mailbox)
    .set(next)
    .where(and(eq(mailbox.id, id), eq(mailbox.userId, session.user.id)))
    .returning();
  return NextResponse.json(mailboxToPublic(row!));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const existing = await getMailboxForUser(id, session.user.id);
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  await db.delete(mailbox).where(and(eq(mailbox.id, id), eq(mailbox.userId, session.user.id)));
  await writeAudit({ action: 'mailbox.delete', resource: 'mailbox', resourceId: id });
  return NextResponse.json({ ok: true });
}
