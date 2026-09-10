import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { lead, searchQuery, tag } from '@/lib/leads/schema';
import { emptyToNull, nowIso, requireString } from '@/lib/leads/http';
import { pageMeta, pageOffset, parseLimit, parsePage } from '@/lib/leads/pagination';
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function GET(req: NextRequest) {
  if (!(await requireSession())) return unauthorized();
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const searched = req.nextUrl.searchParams.get('searched');
  const tagId = (req.nextUrl.searchParams.get('tag_id') ?? '').trim();
  const page = parsePage(req.nextUrl.searchParams.get('page'));
  const limit = parseLimit(req.nextUrl.searchParams.get('limit'));
  const db = getLeadsDb();

  const filters = [];
  if (q) filters.push(ilike(searchQuery.query, `%${q}%`));
  if (searched === 'true') filters.push(eq(searchQuery.searched, true));
  if (searched === 'false') filters.push(eq(searchQuery.searched, false));
  if (tagId === 'none') {
    filters.push(sql`NOT EXISTS (
      SELECT 1 FROM search_query_tag sqt
      WHERE sqt.search_query_id = ${searchQuery.id}
    )`);
  } else if (tagId) {
    filters.push(sql`EXISTS (
      SELECT 1 FROM search_query_tag sqt
      WHERE sqt.search_query_id = ${searchQuery.id}
        AND sqt.tag_id = ${tagId}
    )`);
  }

  const where = filters.length ? and(...filters) : undefined;

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(searchQuery)
    .where(where);

  const paging = pageMeta(countRow?.total ?? 0, page, limit);

  const rows = await db
    .select({
      id: searchQuery.id,
      query: searchQuery.query,
      searched: searchQuery.searched,
      searchedAt: searchQuery.searchedAt,
      createdAt: searchQuery.createdAt,
      lead_count: sql<number>`count(${lead.id})::int`,
      tags: sql<{ id: string; name: string }[]>`
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('id', t.id, 'name', t.name)
              ORDER BY t.name
            )
            FROM search_query_tag sqt
            JOIN tag t ON t.id = sqt.tag_id
            WHERE sqt.search_query_id = ${searchQuery.id}
          ),
          '[]'::json
        )
      `,
    })
    .from(searchQuery)
    .leftJoin(lead, eq(lead.searchQueryId, searchQuery.id))
    .where(where)
    .groupBy(searchQuery.id)
    .orderBy(desc(searchQuery.createdAt))
    .limit(paging.limit)
    .offset(pageOffset(paging.page, paging.limit));

  const tags = await db
    .select({
      id: tag.id,
      name: tag.name,
      search_count: sql<number>`(
        SELECT count(*)::int FROM search_query_tag sqt WHERE sqt.tag_id = ${tag.id}
      )`,
    })
    .from(tag)
    .orderBy(asc(tag.name));

  const [{ untagged_count }] = await db
    .select({
      untagged_count: sql<number>`count(*)::int`,
    })
    .from(searchQuery)
    .where(sql`NOT EXISTS (
      SELECT 1 FROM search_query_tag sqt
      WHERE sqt.search_query_id = ${searchQuery.id}
    )`);

  return NextResponse.json({
    search_queries: rows,
    meta: {
      ...paging,
      returned: rows.length,
      tag_id: tagId || null,
      tags,
      untagged_count: untagged_count ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireSession())) return unauthorized();
  try {
    const body = await req.json();
    const query = requireString(body.query, 'query');
    const searched = Boolean(body.searched ?? false);
    const ts = nowIso();

    const db = getLeadsDb();
    const [row] = await db
      .insert(searchQuery)
      .values({
        query,
        searched,
        searchedAt: searched ? (emptyToNull(body.searched_at ?? body.searchedAt) ?? ts) : null,
        createdAt: ts,
      })
      .returning();

    return NextResponse.json({ ok: true, search_query: row }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler' }, { status: 400 });
  }
}
