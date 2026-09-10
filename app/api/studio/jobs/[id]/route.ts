import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db } from '@/lib/db';
import { studioJob } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { processJob } from '@/lib/studio/process';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  const row = await db.query.studioJob.findFirst({
    where: eq(studioJob.id, id),
    with: { assets: true },
  });
  if (!row) return NextResponse.json({ error: 'Auftrag nicht gefunden.' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSession())) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  if (body.action === 'retry') {
    await db
      .update(studioJob)
      .set({ status: 'queued', error: null, updatedAt: new Date().toISOString() })
      .where(eq(studioJob.id, id));
    after(() => processJob(id));
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'cancel') {
    await db
      .update(studioJob)
      .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .where(eq(studioJob.id, id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
}
