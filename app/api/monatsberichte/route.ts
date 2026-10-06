import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';
import { db } from '@/lib/db';
import { company, project, task, timeEntry } from '@/lib/schema';
import { durationOf } from '@/lib/time-entries';

function parseMonth(raw: string | null): { key: string; start: Date; end: Date } | null {
  const key = (raw ?? '').trim() || currentMonthKey();
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isInteger(y) || mo < 1 || mo > 12) return null;
  const start = new Date(y, mo - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, mo, 1, 0, 0, 0, 0);
  return { key: `${y}-${String(mo).padStart(2, '0')}`, start, end };
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = parseMonth(req.nextUrl.searchParams.get('month'));
  if (!parsed) {
    return NextResponse.json({ error: 'month muss YYYY-MM sein' }, { status: 400 });
  }

  const userId = session.user.id;
  const now = new Date();
  const rows = await db
    .select({
      id: timeEntry.id,
      task_id: timeEntry.taskId,
      started_at: timeEntry.startedAt,
      stopped_at: timeEntry.stoppedAt,
      duration_seconds: timeEntry.durationSeconds,
      title: sql<string>`COALESCE(${timeEntry.title}, ${task.title})`,
      project_id: project.id,
      projekt: project.name,
      firma: sql<string>`COALESCE(${company.name}, '')`,
    })
    .from(timeEntry)
    .innerJoin(task, eq(timeEntry.taskId, task.id))
    .innerJoin(project, eq(task.projectId, project.id))
    .leftJoin(company, eq(project.companyId, company.id))
    .where(
      and(
        eq(timeEntry.userId, userId),
        gte(timeEntry.startedAt, parsed.start.toISOString()),
        lt(timeEntry.startedAt, parsed.end.toISOString()),
      ),
    )
    .orderBy(asc(timeEntry.startedAt));

  type Entry = {
    id: string;
    title: string;
    started_at: string;
    stopped_at: string | null;
    duration_seconds: number;
  };

  type ProjectBucket = {
    project_id: string;
    name: string;
    firma: string;
    total_seconds: number;
    entries: Entry[];
  };

  const byProject = new Map<string, ProjectBucket>();

  for (const row of rows) {
    const secs = row.stopped_at
      ? (row.duration_seconds || durationOf(row.started_at, row.stopped_at))
      : Math.max(0, Math.floor((now.getTime() - new Date(row.started_at).getTime()) / 1000));

    let bucket = byProject.get(row.project_id);
    if (!bucket) {
      bucket = {
        project_id: row.project_id,
        name: row.projekt,
        firma: row.firma || '',
        total_seconds: 0,
        entries: [],
      };
      byProject.set(row.project_id, bucket);
    }

    bucket.total_seconds += secs;
    bucket.entries.push({
      id: row.id,
      title: row.title,
      started_at: row.started_at,
      stopped_at: row.stopped_at,
      duration_seconds: secs,
    });
  }

  const projects = [...byProject.values()].sort((a, b) => {
    if (b.total_seconds !== a.total_seconds) return b.total_seconds - a.total_seconds;
    return a.name.localeCompare(b.name, 'de');
  });

  const total_seconds = projects.reduce((s, p) => s + p.total_seconds, 0);
  const entry_count = projects.reduce((s, p) => s + p.entries.length, 0);

  return NextResponse.json({
    month: parsed.key,
    summary: {
      total_seconds,
      entry_count,
      project_count: projects.length,
    },
    projects,
  });
}
