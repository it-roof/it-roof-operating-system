import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { campaignLead } from '@/lib/leads/schema';
import { emptyToNull, requireString } from '@/lib/leads/http';
import { eq } from 'drizzle-orm';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getLeadsDb();
  const [row] = await db.select().from(campaignLead).where(eq(campaignLead.id, id));
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const updates: Partial<typeof campaignLead.$inferInsert> = {};

  if (body.campaign_id !== undefined || body.campaignId !== undefined) {
    updates.campaignId = requireString(body.campaign_id ?? body.campaignId, 'campaign_id');
  }
  if (body.lead_id !== undefined || body.leadId !== undefined) {
    updates.leadId = requireString(body.lead_id ?? body.leadId, 'lead_id');
  }
  if (body.current_step_id !== undefined || body.currentStepId !== undefined) {
    updates.currentStepId = emptyToNull(body.current_step_id ?? body.currentStepId);
  }
  if (body.status !== undefined) updates.status = requireString(body.status, 'status');
  if (body.last_action_at !== undefined || body.lastActionAt !== undefined) {
    updates.lastActionAt = emptyToNull(body.last_action_at ?? body.lastActionAt);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nichts zu updaten' }, { status: 400 });
  }

  try {
    const db = getLeadsDb();
    const [row] = await db.update(campaignLead).set(updates).where(eq(campaignLead.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    return NextResponse.json({ ok: true, campaign_lead: row });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getLeadsDb();
  const [row] = await db.delete(campaignLead).where(eq(campaignLead.id, id)).returning({ id: campaignLead.id });
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
