import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { task } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status, title, time_estimate_minutes } = body;

  const updates: Partial<typeof task.$inferInsert> = {};
  if (title !== undefined) updates.title = title;
  if (status !== undefined) updates.status = status;
  if (time_estimate_minutes !== undefined) updates.timeEstimateMinutes = time_estimate_minutes;
  if (status === 'done') updates.completedAt = new Date().toISOString();
  if (status === 'open') updates.completedAt = null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nichts zu updaten' }, { status: 400 });
  }

  await db.update(task).set(updates).where(eq(task.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(task).where(eq(task.id, id));
  return NextResponse.json({ ok: true });
}
