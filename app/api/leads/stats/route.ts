import { NextResponse } from 'next/server';
import { getLeadsDb } from '@/lib/leads/db';
import {
  campaign,
  campaignLead,
  lead,
  leadContact,
  searchQuery,
} from '@/lib/leads/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { requireSession, unauthorized } from '@/lib/auth/require-session';

export async function GET() {
  if (!(await requireSession())) return unauthorized();
  const db = getLeadsDb();

  const [
    leadTotals,
    statusRows,
    contactTotals,
    campaignTotals,
    searchTotals,
    topCities,
    topIndustries,
    topSearches,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        complete: sql<number>`count(*) FILTER (WHERE ${lead.status} = 'complete')::int`,
        with_domain: sql<number>`count(*) FILTER (
          WHERE ${lead.domain} IS NOT NULL AND ${lead.domain} <> ''
        )::int`,
        with_phone: sql<number>`count(*) FILTER (
          WHERE ${lead.phone} IS NOT NULL AND ${lead.phone} <> ''
        )::int`,
      })
      .from(lead)
      .then((r) => r[0]),
    db
      .select({
        status: lead.status,
        n: sql<number>`count(*)::int`,
      })
      .from(lead)
      .groupBy(lead.status)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        leads_with_contact: sql<number>`count(DISTINCT ${leadContact.leadId})::int`,
      })
      .from(leadContact)
      .then((r) => r[0]),
    db
      .select({
        assignments: sql<number>`count(*)::int`,
        leads_in_campaigns: sql<number>`count(DISTINCT ${campaignLead.leadId})::int`,
      })
      .from(campaignLead)
      .then((r) => r[0]),
    db
      .select({
        total: sql<number>`count(*)::int`,
        searched: sql<number>`count(*) FILTER (WHERE ${searchQuery.searched} = true)::int`,
        pending: sql<number>`count(*) FILTER (WHERE ${searchQuery.searched} = false)::int`,
      })
      .from(searchQuery)
      .then((r) => r[0]),
    db
      .select({
        city: lead.city,
        n: sql<number>`count(*)::int`,
      })
      .from(lead)
      .where(sql`${lead.city} IS NOT NULL AND ${lead.city} <> ''`)
      .groupBy(lead.city)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db
      .select({
        industry: lead.industry,
        n: sql<number>`count(*)::int`,
      })
      .from(lead)
      .where(sql`${lead.industry} IS NOT NULL AND ${lead.industry} <> ''`)
      .groupBy(lead.industry)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db
      .select({
        id: searchQuery.id,
        query: searchQuery.query,
        lead_count: sql<number>`count(${lead.id})::int`,
      })
      .from(searchQuery)
      .leftJoin(lead, eq(lead.searchQueryId, searchQuery.id))
      .groupBy(searchQuery.id)
      .orderBy(desc(sql`count(${lead.id})`))
      .limit(8),
  ]);

  const total = leadTotals?.total ?? 0;
  const complete = leadTotals?.complete ?? 0;
  const withContact = contactTotals?.leads_with_contact ?? 0;

  // Kampagnen-Anzahl auch ohne Zuordnungen
  const [campaignCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(campaign);

  return NextResponse.json({
    leads: {
      total,
      complete,
      with_domain: leadTotals?.with_domain ?? 0,
      with_phone: leadTotals?.with_phone ?? 0,
      with_contact: withContact,
      without_contact: Math.max(0, total - withContact),
      completion_rate: total > 0 ? Math.round((complete / total) * 100) : 0,
    },
    by_status: statusRows.map((r) => ({ status: r.status, n: r.n })),
    contacts: { total: contactTotals?.total ?? 0 },
    campaigns: {
      total: campaignCount?.total ?? 0,
      assignments: campaignTotals?.assignments ?? 0,
      leads_in_campaigns: campaignTotals?.leads_in_campaigns ?? 0,
    },
    searches: {
      total: searchTotals?.total ?? 0,
      searched: searchTotals?.searched ?? 0,
      pending: searchTotals?.pending ?? 0,
    },
    top_cities: topCities
      .filter((r): r is { city: string; n: number } => !!r.city)
      .map((r) => ({ city: r.city, n: r.n })),
    top_industries: topIndustries
      .filter((r): r is { industry: string; n: number } => !!r.industry)
      .map((r) => ({ industry: r.industry, n: r.n })),
    top_searches: topSearches.map((r) => ({
      id: r.id,
      query: r.query,
      lead_count: r.lead_count,
    })),
  });
}
