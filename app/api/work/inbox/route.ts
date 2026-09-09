import { NextRequest, NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import { campaign, campaignLead, campaignStep, lead, leadContact } from '@/lib/leads/schema';
import { campaignStepMeta } from '@/lib/leads/campaign-steps';
import { renderStepTemplates } from '@/lib/leads/template';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';

/** Globale Inbox: offene Kampagnen-Leads über alle Kampagnen. */
export async function GET(req: NextRequest) {
  const campaignId = (req.nextUrl.searchParams.get('campaign_id') ?? '').trim();
  const db = getLeadsDb();

  const filters = [ne(campaignLead.status, 'done')];
  if (campaignId) filters.push(eq(campaignLead.campaignId, campaignId));

  const rows = await db
    .select({
      id: campaignLead.id,
      campaign_id: campaignLead.campaignId,
      campaign_name: campaign.name,
      lead_id: campaignLead.leadId,
      current_step_id: campaignLead.currentStepId,
      status: campaignLead.status,
      last_action_at: campaignLead.lastActionAt,
      created_at: campaignLead.createdAt,
      company_name: lead.companyName,
      city: lead.city,
      phone: lead.phone,
      domain: lead.domain,
    })
    .from(campaignLead)
    .innerJoin(lead, eq(lead.id, campaignLead.leadId))
    .innerJoin(campaign, eq(campaign.id, campaignLead.campaignId))
    .where(and(...filters))
    .orderBy(asc(campaignLead.createdAt));

  const campaignIds = [...new Set(rows.map((r) => r.campaign_id))];
  const leadIds = rows.map((r) => r.lead_id);

  const steps = campaignIds.length
    ? await db
        .select()
        .from(campaignStep)
        .where(inArray(campaignStep.campaignId, campaignIds))
        .orderBy(asc(campaignStep.stepOrder))
    : [];

  const stepsByCampaign = new Map<string, typeof steps>();
  const stepById = new Map(steps.map((s) => [s.id, s]));
  for (const s of steps) {
    const list = stepsByCampaign.get(s.campaignId) ?? [];
    list.push(s);
    stepsByCampaign.set(s.campaignId, list);
  }

  const contacts = leadIds.length
    ? await db
        .select()
        .from(leadContact)
        .where(inArray(leadContact.leadId, leadIds))
        .orderBy(asc(leadContact.createdAt))
    : [];

  const firstContactByLead = new Map<string, (typeof contacts)[number]>();
  for (const c of contacts) {
    if (!firstContactByLead.has(c.leadId)) firstContactByLead.set(c.leadId, c);
  }

  const campaignsMeta = new Map<string, { id: string; name: string; n: number }>();

  const items = rows.map((r) => {
    const campSteps = stepsByCampaign.get(r.campaign_id) ?? [];
    let step = r.current_step_id ? stepById.get(r.current_step_id) : undefined;
    if (!step && campSteps.length) step = campSteps[0];

    const contact = firstContactByLead.get(r.lead_id) ?? null;
    const rendered = step
      ? renderStepTemplates(
          step.subjectTemplate,
          step.bodyTemplate,
          {
            companyName: r.company_name,
            city: r.city,
            phone: r.phone,
          },
          contact
            ? {
                salutation: contact.salutation,
                firstName: contact.firstName,
                lastName: contact.lastName,
                position: contact.position,
                email: contact.email,
                phone: contact.phone,
              }
            : null,
        )
      : { subject: '', body: '', vars: {} };

    const prev = campaignsMeta.get(r.campaign_id);
    if (prev) prev.n += 1;
    else campaignsMeta.set(r.campaign_id, { id: r.campaign_id, name: r.campaign_name, n: 1 });

    return {
      id: r.id,
      campaign_id: r.campaign_id,
      campaign_name: r.campaign_name,
      lead_id: r.lead_id,
      status: r.status,
      last_action_at: r.last_action_at,
      created_at: r.created_at,
      company_name: r.company_name,
      city: r.city,
      domain: r.domain,
      contact: contact
        ? {
            id: contact.id,
            salutation: contact.salutation,
            first_name: contact.firstName,
            last_name: contact.lastName,
            position: contact.position,
            email: contact.email,
            phone: contact.phone,
          }
        : null,
      current_step: step
        ? {
            id: step.id,
            type: step.type,
            label: campaignStepMeta(step.type).label,
            step_order: step.stepOrder,
            delay_days: step.delayDays,
            uses_template: campaignStepMeta(step.type).usesTemplate,
          }
        : null,
      rendered: {
        subject: rendered.subject,
        body: rendered.body,
      },
    };
  });

  return NextResponse.json({
    items,
    campaigns: [...campaignsMeta.values()].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    meta: {
      total: items.length,
    },
  });
}
