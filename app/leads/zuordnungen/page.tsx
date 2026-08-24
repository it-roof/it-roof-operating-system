'use client';

import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { CampaignLeadsTab } from '@/components/leads/campaign-leads-tab';

export default function LeadsZuordnungenPage() {
  return (
    <PageContainer>
      <PageHeader title="Zuordnungen" subtitle="campaign_lead · CRUD" />
      <CampaignLeadsTab />
    </PageContainer>
  );
}
