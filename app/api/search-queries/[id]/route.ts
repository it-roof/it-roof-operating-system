import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { searchQuery } from '@/lib/leads/schema';
import { emptyToNull, nowIso, requireString } from '@/lib/leads/http';
import { eq } from 'drizzle-orm';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getLeadsDb();
  const [row] = await db.select().from(searchQuery).where(eq(searchQuery.id, id));
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const updates: Partial<typeof searchQuery.$inferInsert> = {};

  if (body.query !== undefined) updates.query = requireString(body.query, 'query');
  if (body.searched !== undefined) {
    updates.searched = Boolean(body.searched);
    if (updates.searched && body.searched_at === undefined && body.searchedAt === undefined) {
      updates.searchedAt = nowIso();
    }
  }
  if (body.searched_at !== undefined || body.searchedAt !== undefined) {
    updates.searchedAt = emptyToNull(body.searched_at ?? body.searchedAt);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nichts zu updaten' }, { status: 400 });
  }

  try {
    const db = getLeadsDb();
    const [row] = await db.update(searchQuery).set(updates).where(eq(searchQuery.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    return NextResponse.json({ ok: true, search_query: row });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getLeadsDb();
  const [row] = await db.delete(searchQuery).where(eq(searchQuery.id, id)).returning({ id: searchQuery.id });
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
