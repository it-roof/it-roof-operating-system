'use client';

import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { LeadsDashboard } from '@/components/leads/leads-dashboard';

export default function LeadsDashboardPage() {
  return (
    <PageContainer>
      <PageHeader title="Dashboard" subtitle="Überblick über Pipeline & Qualität" />
      <LeadsDashboard />
    </PageContainer>
  );
}
