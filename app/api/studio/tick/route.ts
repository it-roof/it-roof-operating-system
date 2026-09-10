import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { processQueuedJobs } from '@/lib/studio/process';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function POST(_req: NextRequest) {
  if (!(await requireSession())) return unauthorized();
  after(() => processQueuedJobs(2));
  return NextResponse.json({ ok: true });
}
