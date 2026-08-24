'use client';

import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { CampaignsTab } from '@/components/leads/campaigns-tab';

export default function LeadsKampagnenPage() {
  return (
    <PageContainer>
      <PageHeader title="Kampagnen" subtitle="campaign · CRUD" />
      <CampaignsTab />
    </PageContainer>
  );
}
