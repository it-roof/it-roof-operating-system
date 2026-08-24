'use client';

import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { StepsTab } from '@/components/leads/steps-tab';

export default function LeadsStepsPage() {
  return (
    <PageContainer>
      <PageHeader title="Steps" subtitle="campaign_step · CRUD" />
      <StepsTab />
    </PageContainer>
  );
}
