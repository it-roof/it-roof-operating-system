import { NextRequest, NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { syncAllMailboxes } from '@/lib/mail/sync';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const cron = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get('authorization');
  if (cron && authHeader === `Bearer ${cron}`) {
    const result = await syncAllMailboxes();
    return NextResponse.json({ ok: true, ...result });
  }

  const session = await requireSession();
  if (!session) return unauthorized();
  const body = await req.json().catch(() => ({})) as { mailbox_id?: string };
  if (body.mailbox_id) {
    const { syncMailbox } = await import('@/lib/mail/sync');
    try {
      const result = await syncMailbox(body.mailbox_id, session.user.id);
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync fehlgeschlagen';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  const result = await syncAllMailboxes(session.user.id);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
