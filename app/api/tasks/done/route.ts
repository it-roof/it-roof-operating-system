import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { task, project, company } from '@/lib/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function GET() {
  if (!(await requireSession())) return unauthorized();
  const rows = await db
    .select({
      id: task.id,
      title: task.title,
      prio: task.priority,
      zeit_minuten: task.timeEstimateMinutes,
      completed_at: task.completedAt,
      projekt: project.name,
      firma: sql<string>`COALESCE(${company.name}, '')`,
    })
    .from(task)
    .innerJoin(project, eq(task.projectId, project.id))
    .leftJoin(company, eq(project.companyId, company.id))
    .where(
      and(
        eq(task.status, 'done'),
        sql`${task.completedAt} >= NOW() - INTERVAL '90 days'`,
      )
    )
    .orderBy(desc(task.completedAt))
    .limit(100);

  return NextResponse.json(rows);
}
