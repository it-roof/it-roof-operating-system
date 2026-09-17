import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timeEntry, task } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { writeAudit } from '@/lib/auth/audit';
import { durationOf, getTimeEntryById, otherUsersHaveEntries } from '@/lib/time-entries';
import { addSeconds, shiftToLocalDate } from '@/lib/time-entry-utils';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = session.user.id;
  const { id } = await params;
  const body = await req.json() as {
    started_at?: string;
    stopped_at?: string | null;
    duration_seconds?: number;
    date?: string;
    title?: string;
    project_id?: string;
  };

  const isLegacy = id.startsWith('legacy:');
  const existing = isLegacy
    ? null
    : await db.select().from(timeEntry).where(
        and(eq(timeEntry.id, id), eq(timeEntry.userId, userId)),
      ).then(r => r[0] ?? null);
  const taskId = isLegacy ? id.slice('legacy:'.length) : existing?.taskId;
  if (!taskId) {
    return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 });
  }

  let startedAt = body.started_at ?? existing?.startedAt ?? new Date().toISOString();
  let stoppedAt: string | null =
    body.stopped_at !== undefined
      ? body.stopped_at
      : (existing?.stoppedAt ?? null);

  if (body.date) {
    startedAt = shiftToLocalDate(startedAt, body.date);
    if (stoppedAt) stoppedAt = shiftToLocalDate(stoppedAt, body.date);
  }

  if (body.duration_seconds != null) {
    stoppedAt = addSeconds(startedAt, Math.max(0, body.duration_seconds));
  }

  if (stoppedAt && new Date(stoppedAt).getTime() < new Date(startedAt).getTime()) {
    return NextResponse.json({ error: 'Ende liegt vor dem Start' }, { status: 400 });
  }

  if (body.project_id !== undefined && await otherUsersHaveEntries(taskId, userId)) {
    return NextResponse.json(
      { error: 'Projekt ist geteilt — der andere Mitarbeiter hat auch Zeit darauf.' },
      { status: 409 },
    );
  }

  const durationSeconds = durationOf(startedAt, stoppedAt);

  let entryId = existing?.id;
  if (isLegacy) {
    const [row] = await db
      .insert(timeEntry)
      .values({
        taskId,
        userId,
        title: body.title?.trim() || null,
        startedAt,
        stoppedAt,
        durationSeconds,
      })
      .returning({ id: timeEntry.id });
    entryId = row.id;
  } else {
    await db.update(timeEntry).set({
      startedAt,
      stoppedAt,
      durationSeconds,
      ...(body.title !== undefined ? { title: body.title.trim() || null } : {}),
    }).where(and(eq(timeEntry.id, id), eq(timeEntry.userId, userId)));
  }

  if (body.project_id !== undefined) {
    await db.update(task).set({ projectId: body.project_id }).where(eq(task.id, taskId));
  }

  const row = entryId ? await getTimeEntryById(entryId, userId) : null;
  return NextResponse.json({ ok: true, entry: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  if (id.startsWith('legacy:')) {
    return NextResponse.json({ error: 'Historischer Eintrag kann nicht gelöscht werden' }, { status: 400 });
  }
  const deleted = await db
    .delete(timeEntry)
    .where(and(eq(timeEntry.id, id), eq(timeEntry.userId, session.user.id)))
    .returning({ id: timeEntry.id });
  if (!deleted[0]) {
    return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 });
  }
  await writeAudit({ action: 'time_entry.delete', resource: 'time_entry', resourceId: id });
  return NextResponse.json({ ok: true });
}
