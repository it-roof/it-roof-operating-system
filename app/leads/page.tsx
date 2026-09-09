'use client';

import { Suspense } from 'react';
import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { LeadsTab } from '@/components/leads/leads-tab';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeadsPage() {
  return (
    <PageContainer>
      <PageHeader title="Leads" subtitle="lead · CRUD" />
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
        <LeadsTab />
      </Suspense>
    </PageContainer>
  );
}
