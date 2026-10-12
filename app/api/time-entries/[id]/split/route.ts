import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { db } from '@/lib/db';
import { timeEntry } from '@/lib/schema';
import { durationOf, getTimeEntryById } from '@/lib/time-entries';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Split: Stunden vom Eintrag abziehen und neuen Eintrag direkt danach anlegen.
 * Alt 09:00–13:00 (4h), Split 1h → Alt 09:00–12:00, Neu 12:00–13:00.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = session.user.id;
  const { id } = await params;

  if (id.startsWith('legacy:')) {
    return NextResponse.json({ error: 'Historischer Eintrag kann nicht gesplittet werden' }, { status: 400 });
  }

  const body = await req.json() as {
    title?: string;
    duration_seconds?: number;
    hours?: number;
  };

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'title erforderlich' }, { status: 400 });
  }

  let splitSecs = 0;
  if (body.duration_seconds != null && Number.isFinite(body.duration_seconds)) {
    splitSecs = Math.round(Math.max(0, body.duration_seconds));
  } else if (body.hours != null && Number.isFinite(body.hours)) {
    splitSecs = Math.round(Math.max(0, body.hours) * 3600);
  }

  if (splitSecs < 60) {
    return NextResponse.json({ error: 'Mindestens 1 Minute zum Splitten' }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(timeEntry)
    .where(and(eq(timeEntry.id, id), eq(timeEntry.userId, userId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 });
  }

  if (!existing.stoppedAt) {
    return NextResponse.json({ error: 'Laufenden Eintrag zuerst stoppen' }, { status: 400 });
  }

  // Wanduhr ist Quelle der Wahrheit (duration_seconds kann veraltet sein)
  const wallSecs = durationOf(existing.startedAt, existing.stoppedAt);
  const totalSecs = wallSecs > 0 ? wallSecs : existing.durationSeconds;
  if (totalSecs < 120) {
    return NextResponse.json({ error: 'Eintrag muss mindestens 2 Minuten lang sein' }, { status: 400 });
  }
  if (splitSecs >= totalSecs) {
    return NextResponse.json(
      { error: 'Split muss kleiner als die aktuelle Dauer sein' },
      { status: 400 },
    );
  }

  const remainSecs = totalSecs - splitSecs;
  if (remainSecs < 60) {
    return NextResponse.json(
      { error: 'Mindestens 1 Minute muss am Original bleiben' },
      { status: 400 },
    );
  }

  const oldStartedAt = existing.startedAt;
  const oldStoppedAt = existing.stoppedAt;
  const oldDuration = existing.durationSeconds;
  const splitStartedAt = new Date(
    new Date(oldStoppedAt).getTime() - splitSecs * 1000,
  ).toISOString();

  if (new Date(splitStartedAt).getTime() <= new Date(oldStartedAt).getTime()) {
    return NextResponse.json({ error: 'Split würde vor dem Start liegen' }, { status: 400 });
  }

  // Alt: Start bleibt, Ende = Beginn des neuen Blocks
  await db
    .update(timeEntry)
    .set({
      stoppedAt: splitStartedAt,
      durationSeconds: remainSecs,
    })
    .where(and(eq(timeEntry.id, id), eq(timeEntry.userId, userId)));

  let createdId: string | null = null;
  try {
    const [created] = await db
      .insert(timeEntry)
      .values({
        taskId: existing.taskId,
        userId,
        title,
        startedAt: splitStartedAt,
        stoppedAt: oldStoppedAt,
        durationSeconds: splitSecs,
      })
      .returning({ id: timeEntry.id });
    createdId = created?.id ?? null;
  } catch (err) {
    // Original wiederherstellen, falls Insert scheitert
    await db
      .update(timeEntry)
      .set({
        stoppedAt: oldStoppedAt,
        durationSeconds: oldDuration,
      })
      .where(and(eq(timeEntry.id, id), eq(timeEntry.userId, userId)));
    throw err;
  }

  const original = await getTimeEntryById(id, userId);
  const createdEntry = createdId ? await getTimeEntryById(createdId, userId) : null;

  return NextResponse.json({
    ok: true,
    original,
    created: createdEntry,
  });
}
