import { db } from '@/lib/db';
import { timeEntry, task, project, company } from '@/lib/schema';
import { eq, isNull, desc, or, gte, and, ne, sql } from 'drizzle-orm';

export const timeEntrySelect = {
  id: timeEntry.id,
  task_id: timeEntry.taskId,
  started_at: timeEntry.startedAt,
  stopped_at: timeEntry.stoppedAt,
  duration_seconds: timeEntry.durationSeconds,
  title: sql<string>`COALESCE(${timeEntry.title}, ${task.title})`,
  projekt: project.name,
  firma: sql<string>`COALESCE(${company.name}, '')`,
  project_id: task.projectId,
};

function forUser(userId: string) {
  return eq(timeEntry.userId, userId);
}

export async function stopRunningEntries(userId: string, now = new Date()) {
  const running = await db
    .select()
    .from(timeEntry)
    .where(and(forUser(userId), isNull(timeEntry.stoppedAt)));

  for (const row of running) {
    const start = new Date(row.startedAt).getTime();
    const durationSeconds = Math.max(0, Math.round((now.getTime() - start) / 1000));
    await db
      .update(timeEntry)
      .set({
        stoppedAt: now.toISOString(),
        durationSeconds,
      })
      .where(eq(timeEntry.id, row.id));
  }

  return running;
}

export function timeEntriesQuery() {
  return db
    .select(timeEntrySelect)
    .from(timeEntry)
    .innerJoin(task, eq(timeEntry.taskId, task.id))
    .innerJoin(project, eq(task.projectId, project.id))
    .leftJoin(company, eq(project.companyId, company.id));
}

export async function getRunningEntry(userId: string) {
  const rows = await timeEntriesQuery()
    .where(and(forUser(userId), isNull(timeEntry.stoppedAt)))
    .orderBy(desc(timeEntry.startedAt));
  return rows[0] ?? null;
}

export function sinceDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Timer-Sessions des eingeloggten Users. */
export async function listTimeEntries(userId: string, days = 90) {
  const since = sinceDaysAgo(days);

  return timeEntriesQuery()
    .where(
      and(
        forUser(userId),
        or(isNull(timeEntry.stoppedAt), gte(timeEntry.startedAt, since)),
      ),
    )
    .orderBy(desc(timeEntry.startedAt));
}

export async function getTimeEntryById(id: string, userId: string) {
  const rows = await timeEntriesQuery().where(and(eq(timeEntry.id, id), forUser(userId)));
  return rows[0] ?? null;
}

export async function otherUsersHaveEntries(taskId: string, userId: string) {
  const rows = await db
    .select({ id: timeEntry.id })
    .from(timeEntry)
    .where(and(eq(timeEntry.taskId, taskId), ne(timeEntry.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export function durationOf(startedAt: string, stoppedAt: string | null) {
  if (!stoppedAt) return 0;
  return Math.max(0, Math.round((new Date(stoppedAt).getTime() - new Date(startedAt).getTime()) / 1000));
}
