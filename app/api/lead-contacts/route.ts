import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { leadContact } from '@/lib/leads/schema';
import { emptyToNull, nowIso, requireString } from '@/lib/leads/http';
import { pageMeta, pageOffset, parseLimit, parsePage } from '@/lib/leads/pagination';
import { and, eq, ilike, or, desc, sql } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function GET(req: NextRequest) {
  if (!(await requireSession())) return unauthorized();
  const leadId = req.nextUrl.searchParams.get('lead_id');
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const page = parsePage(req.nextUrl.searchParams.get('page'));
  const limit = parseLimit(req.nextUrl.searchParams.get('limit'));
  const db = getLeadsDb();

  const filters = [];
  if (leadId) filters.push(eq(leadContact.leadId, leadId));
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(leadContact.firstName, pattern),
        ilike(leadContact.lastName, pattern),
        ilike(leadContact.email, pattern),
        ilike(leadContact.position, pattern),
        ilike(leadContact.phone, pattern),
      ),
    );
  }

  const where = filters.length ? and(...filters) : undefined;

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(leadContact)
    .where(where);

  const paging = pageMeta(countRow?.total ?? 0, page, limit);

  const rows = await db
    .select()
    .from(leadContact)
    .where(where)
    .orderBy(desc(leadContact.createdAt))
    .limit(paging.limit)
    .offset(pageOffset(paging.page, paging.limit));

  return NextResponse.json({
    contacts: rows,
    meta: { ...paging, returned: rows.length },
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireSession())) return unauthorized();
  try {
    const body = await req.json();
    const leadId = requireString(body.lead_id ?? body.leadId, 'lead_id');
    const ts = nowIso();
    const db = getLeadsDb();

    const [row] = await db
      .insert(leadContact)
      .values({
        leadId,
        salutation: emptyToNull(body.salutation),
        firstName: emptyToNull(body.first_name ?? body.firstName),
        lastName: emptyToNull(body.last_name ?? body.lastName),
        position: emptyToNull(body.position),
        email: emptyToNull(body.email),
        phone: emptyToNull(body.phone),
        createdAt: ts,
        updatedAt: ts,
      })
      .returning();

    return NextResponse.json({ ok: true, contact: row }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler' }, { status: 400 });
  }
}
