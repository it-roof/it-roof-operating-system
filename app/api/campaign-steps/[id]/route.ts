import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { campaignLead, campaignStep } from '@/lib/leads/schema';
import { emptyToNull, requireString } from '@/lib/leads/http';
import { isCampaignStepType } from '@/lib/leads/campaign-steps';
import { eq } from 'drizzle-orm';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getLeadsDb();
  const [row] = await db.select().from(campaignStep).where(eq(campaignStep.id, id));
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const updates: Partial<typeof campaignStep.$inferInsert> = {};

  if (body.campaign_id !== undefined || body.campaignId !== undefined) {
    updates.campaignId = requireString(body.campaign_id ?? body.campaignId, 'campaign_id');
  }
  if (body.type !== undefined) {
    const type = requireString(body.type, 'type');
    if (!isCampaignStepType(type)) {
      return NextResponse.json({ error: 'type ungültig' }, { status: 400 });
    }
    updates.type = type;
  }
  if (body.step_order !== undefined || body.stepOrder !== undefined) {
    const n = Number(body.step_order ?? body.stepOrder);
    if (!Number.isFinite(n)) return NextResponse.json({ error: 'step_order ungültig' }, { status: 400 });
    updates.stepOrder = n;
  }
  if (body.delay_days !== undefined || body.delayDays !== undefined) {
    const n = Number(body.delay_days ?? body.delayDays);
    if (!Number.isFinite(n)) return NextResponse.json({ error: 'delay_days ungültig' }, { status: 400 });
    updates.delayDays = n;
  }
  if (body.subject_template !== undefined || body.subjectTemplate !== undefined) {
    updates.subjectTemplate = emptyToNull(body.subject_template ?? body.subjectTemplate);
  }
  if (body.body_template !== undefined || body.bodyTemplate !== undefined) {
    updates.bodyTemplate = emptyToNull(body.body_template ?? body.bodyTemplate);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nichts zu updaten' }, { status: 400 });
  }

  try {
    const db = getLeadsDb();
    const [row] = await db.update(campaignStep).set(updates).where(eq(campaignStep.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    return NextResponse.json({ ok: true, step: row });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getLeadsDb();
  await db.update(campaignLead).set({ currentStepId: null }).where(eq(campaignLead.currentStepId, id));
  const [row] = await db.delete(campaignStep).where(eq(campaignStep.id, id)).returning({ id: campaignStep.id });
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
