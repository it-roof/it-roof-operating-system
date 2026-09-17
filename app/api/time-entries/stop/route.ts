import { NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { stopRunningEntries } from '@/lib/time-entries';

export async function POST() {
  const session = await requireSession();
  if (!session) return unauthorized();
  const stopped = await stopRunningEntries(session.user.id);
  return NextResponse.json({ ok: true, stopped: stopped.length });
}
