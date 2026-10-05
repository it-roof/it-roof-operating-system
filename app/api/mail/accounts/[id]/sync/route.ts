import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { getMailboxForUser } from '@/lib/mail/mailbox';
import { syncMailbox } from '@/lib/mail/sync';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const row = await getMailboxForUser(id, session.user.id);
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  try {
    const result = await syncMailbox(id, session.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync fehlgeschlagen';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
