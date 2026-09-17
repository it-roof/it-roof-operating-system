import { NextRequest, NextResponse } from 'next/server';
import { timeEntry } from '@/lib/schema';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { stopRunningEntries, listTimeEntries, durationOf } from '@/lib/time-entries';
import { db } from '@/lib/db';

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  const rows = await listTimeEntries(session.user.id);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = session.user.id;
  const body = await req.json();
  const { task_id, title: entryTitle, started_at, stopped_at, duration_seconds } = body as {
    task_id?: string;
    title?: string;
    started_at?: string;
    stopped_at?: string | null;
    duration_seconds?: number;
  };
  if (!task_id) {
    return NextResponse.json({ error: 'task_id required' }, { status: 400 });
  }
  const title = typeof entryTitle === 'string' && entryTitle.trim() ? entryTitle.trim() : null;

  const isManual = Boolean(started_at) && (stopped_at != null || duration_seconds != null);
  if (isManual) {
    const startedAt = started_at!;
    const stoppedAt = stopped_at
      ?? new Date(new Date(startedAt).getTime() + Math.max(0, duration_seconds ?? 0) * 1000).toISOString();
    if (new Date(stoppedAt).getTime() < new Date(startedAt).getTime()) {
      return NextResponse.json({ error: 'Ende liegt vor dem Start' }, { status: 400 });
    }
    const [row] = await db
      .insert(timeEntry)
      .values({
        taskId: task_id,
        userId,
        title,
        startedAt,
        stoppedAt,
        durationSeconds: durationOf(startedAt, stoppedAt),
      })
      .returning({
        id: timeEntry.id,
        task_id: timeEntry.taskId,
        started_at: timeEntry.startedAt,
      });
    return NextResponse.json({ ok: true, ...row });
  }

  try {
    await stopRunningEntries(userId);
    const startedAt = new Date().toISOString();
    const [row] = await db
      .insert(timeEntry)
      .values({
        taskId: task_id,
        userId,
        title,
        startedAt,
        durationSeconds: 0,
      })
      .returning({
        id: timeEntry.id,
        task_id: timeEntry.taskId,
        started_at: timeEntry.startedAt,
      });

    return NextResponse.json({ ok: true, ...row });
  } catch {
    return NextResponse.json({ error: 'Timer konnte nicht gestartet werden' }, { status: 409 });
  }
}
