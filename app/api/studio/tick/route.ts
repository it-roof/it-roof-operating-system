import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { processQueuedJobs } from '@/lib/studio/process';

export async function POST(_req: NextRequest) {
  after(() => processQueuedJobs(2));
  return NextResponse.json({ ok: true });
}
