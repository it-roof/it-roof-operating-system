import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { campaignStep } from '@/lib/leads/schema';
import { nowIso, requireString } from '@/lib/leads/http';
import { asc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaign_id');
  const db = getLeadsDb();

  const rows = await db
    .select()
    .from(campaignStep)
    .where(campaignId ? eq(campaignStep.campaignId, campaignId) : undefined)
    .orderBy(asc(campaignStep.campaignId), asc(campaignStep.stepOrder));

  return NextResponse.json({ steps: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const campaignId = requireString(body.campaign_id ?? body.campaignId, 'campaign_id');
    const type = requireString(body.type, 'type');
    const stepOrder = Number(body.step_order ?? body.stepOrder);
    const delayDays = Number(body.delay_days ?? body.delayDays ?? 0);

    if (!Number.isFinite(stepOrder)) {
      return NextResponse.json({ error: 'step_order erforderlich' }, { status: 400 });
    }

    const db = getLeadsDb();
    const [row] = await db
      .insert(campaignStep)
      .values({
        campaignId,
        stepOrder,
        type,
        delayDays: Number.isFinite(delayDays) ? delayDays : 0,
        createdAt: nowIso(),
      })
      .returning();

    return NextResponse.json({ ok: true, step: row }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler' }, { status: 400 });
  }
}
