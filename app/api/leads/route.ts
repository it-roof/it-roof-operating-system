import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { lead, leadContact, searchQuery } from '@/lib/leads/schema';
import { emptyToNull, nowIso, requireString } from '@/lib/leads/http';
import { pageMeta, pageOffset, parseLimit, parsePage } from '@/lib/leads/pagination';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const status = req.nextUrl.searchParams.get('status') ?? 'all';
  const city = (req.nextUrl.searchParams.get('city') ?? '').trim();
  const searchQueryId = (req.nextUrl.searchParams.get('search_query_id') ?? '').trim();
  const page = parsePage(req.nextUrl.searchParams.get('page'));
  const limit = parseLimit(req.nextUrl.searchParams.get('limit'));

  const db = getLeadsDb();

  const filters = [];
  if (status !== 'all') filters.push(eq(lead.status, status));
  if (city) filters.push(eq(lead.city, city));
  if (searchQueryId) filters.push(eq(lead.searchQueryId, searchQueryId));
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(lead.companyName, pattern),
        ilike(lead.city, pattern),
        ilike(lead.industry, pattern),
        ilike(lead.domain, pattern),
        ilike(lead.phone, pattern),
        sql`EXISTS (
          SELECT 1 FROM lead_contact lc
          WHERE lc.lead_id = ${lead.id}
            AND (
              lc.first_name ILIKE ${pattern}
              OR lc.last_name ILIKE ${pattern}
              OR lc.email ILIKE ${pattern}
              OR CONCAT_WS(' ', lc.first_name, lc.last_name) ILIKE ${pattern}
            )
        )`,
      ),
    );
  }

  const where = filters.length ? and(...filters) : undefined;

  const [filteredRow, statsRow, cityRows, searchRows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(lead)
      .where(where)
      .then((r) => r[0]),
    db
      .select({
        total: sql<number>`count(*)::int`,
        complete: sql<number>`count(*) FILTER (WHERE ${lead.status} = 'complete')::int`,
      })
      .from(lead)
      .then((r) => r[0]),
    db
      .select({
        city: lead.city,
        n: sql<number>`count(*)::int`,
      })
      .from(lead)
      .where(sql`${lead.city} IS NOT NULL AND ${lead.city} <> ''`)
      .groupBy(lead.city)
      .orderBy(lead.city),
    db
      .select({
        id: searchQuery.id,
        query: searchQuery.query,
        lead_count: sql<number>`count(${lead.id})::int`,
      })
      .from(searchQuery)
      .leftJoin(lead, eq(lead.searchQueryId, searchQuery.id))
      .groupBy(searchQuery.id)
      .orderBy(desc(searchQuery.createdAt)),
  ]);

  const filteredTotal = filteredRow?.total ?? 0;
  const paging = pageMeta(filteredTotal, page, limit);

  const rows = await db
    .select({
      id: lead.id,
      company_name: lead.companyName,
      domain: lead.domain,
      street: lead.street,
      city: lead.city,
      country_code: lead.countryCode,
      phone: lead.phone,
      industry: lead.industry,
      status: lead.status,
      created_at: lead.createdAt,
      search_query_id: lead.searchQueryId,
      contacts: sql<{
        id: string;
        salutation: string | null;
        first_name: string | null;
        last_name: string | null;
        position: string | null;
        email: string | null;
        phone: string | null;
      }[]>`
        COALESCE(
          json_agg(
            json_build_object(
              'id', ${leadContact.id},
              'salutation', ${leadContact.salutation},
              'first_name', ${leadContact.firstName},
              'last_name', ${leadContact.lastName},
              'position', ${leadContact.position},
              'email', ${leadContact.email},
              'phone', ${leadContact.phone}
            )
            ORDER BY ${leadContact.lastName} NULLS LAST, ${leadContact.firstName} NULLS LAST
          ) FILTER (WHERE ${leadContact.id} IS NOT NULL),
          '[]'
        )
      `,
    })
    .from(lead)
    .leftJoin(leadContact, eq(leadContact.leadId, lead.id))
    .where(where)
    .groupBy(lead.id)
    .orderBy(lead.companyName)
    .limit(paging.limit)
    .offset(pageOffset(paging.page, paging.limit));

  return NextResponse.json({
    leads: rows,
    meta: {
      ...paging,
      returned: rows.length,
      complete: statsRow?.complete ?? 0,
      all_total: statsRow?.total ?? 0,
      q,
      status,
      city,
      search_query_id: searchQueryId || null,
      cities: cityRows
        .filter((r): r is { city: string; n: number } => !!r.city)
        .map((r) => ({ city: r.city, n: r.n })),
      searches: searchRows.map((r) => ({
        id: r.id,
        query: r.query,
        lead_count: r.lead_count,
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companyName = requireString(body.company_name ?? body.companyName, 'company_name');
    const status = (body.status ?? 'raw').trim() || 'raw';

    const db = getLeadsDb();
    const [row] = await db
      .insert(lead)
      .values({
        companyName,
        domain: emptyToNull(body.domain),
        street: emptyToNull(body.street),
        city: emptyToNull(body.city),
        countryCode: emptyToNull(body.country_code ?? body.countryCode) ?? 'DE',
        phone: emptyToNull(body.phone),
        industry: emptyToNull(body.industry),
        status,
        createdAt: nowIso(),
      })
      .returning();

    return NextResponse.json({ ok: true, lead: row }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler' }, { status: 400 });
  }
}
