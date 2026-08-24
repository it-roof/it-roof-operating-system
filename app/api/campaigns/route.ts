import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { campaign, campaignStep } from '@/lib/leads/schema';
import { emptyToNull, nowIso, requireString } from '@/lib/leads/http';
import { desc, eq, ilike, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const db = getLeadsDb();

  const rows = await db
    .select({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      created_at: campaign.createdAt,
      step_count: sql<number>`count(${campaignStep.id})::int`,
    })
    .from(campaign)
    .leftJoin(campaignStep, eq(campaignStep.campaignId, campaign.id))
    .where(q ? ilike(campaign.name, `%${q}%`) : undefined)
    .groupBy(campaign.id)
    .orderBy(desc(campaign.createdAt));

  return NextResponse.json({ campaigns: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = requireString(body.name, 'name');
    const db = getLeadsDb();
    const [row] = await db
      .insert(campaign)
      .values({
        name,
        description: emptyToNull(body.description),
        createdAt: nowIso(),
      })
      .returning();
    return NextResponse.json({ ok: true, campaign: row }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler' }, { status: 400 });
  }
}
