'use client';

import { Suspense } from 'react';
import { PageContainer } from '@/components/page-container';
import { LeadsTab } from '@/components/leads/leads-tab';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeadsPage() {
  return (
    <PageContainer fill>
      <Suspense fallback={<Skeleton className="m-6 h-64 w-full rounded-lg" />}>
        <LeadsTab />
      </Suspense>
    </PageContainer>
  );
}
