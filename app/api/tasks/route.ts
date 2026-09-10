import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { task, project, company } from '@/lib/schema';
import { eq, ne, sql } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function GET() {
  if (!(await requireSession())) return unauthorized();
  const rows = await db
    .select({
      id: task.id,
      title: task.title,
      status: task.status,
      prio: task.priority,
      geplant: task.plannedDate,
      deadline: task.deadline,
      zeit_minuten: task.timeEstimateMinutes,
      projekt: project.name,
      firma: sql<string>`COALESCE(${company.name}, '')`,
    })
    .from(task)
    .innerJoin(project, eq(task.projectId, project.id))
    .leftJoin(company, eq(project.companyId, company.id))
    .where(ne(task.status, 'done'))
    .orderBy(
      sql`${task.plannedDate} NULLS LAST`,
      sql`CASE ${task.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
    );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await requireSession())) return unauthorized();
  const { title, priority, project_id, planned_date, time_estimate_minutes } = await req.json();
  if (!title || !project_id) {
    return NextResponse.json({ error: 'title + project_id required' }, { status: 400 });
  }

  const [row] = await db
    .insert(task)
    .values({
      title,
      priority: priority ?? 'medium',
      projectId: project_id,
      plannedDate: planned_date ?? null,
      timeEstimateMinutes: time_estimate_minutes ?? null,
      status: 'open',
      type: 'task',
    })
    .returning({ id: task.id });

  return NextResponse.json({ ok: true, id: row.id });
}
