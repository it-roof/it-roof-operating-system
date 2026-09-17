import { NextResponse } from 'next/server';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { getRunningEntry } from '@/lib/time-entries';

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  const row = await getRunningEntry(session.user.id);
  return NextResponse.json(row);
}
