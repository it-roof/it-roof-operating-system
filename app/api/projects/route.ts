import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { project, company } from '@/lib/schema';
import { eq, asc } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function GET(req: NextRequest) {
  if (!(await requireSession())) return unauthorized();
  const companyId = req.nextUrl.searchParams.get('company_id');

  const base = db
    .select({
      id: project.id,
      name: project.name,
      company_id: project.companyId,
      firma: company.name,
    })
    .from(project)
    .leftJoin(company, eq(company.id, project.companyId));

  const rows = companyId
    ? await base.where(eq(project.companyId, companyId)).orderBy(asc(project.name))
    : await base.orderBy(asc(company.name), asc(project.name));

  return NextResponse.json(rows);
}
