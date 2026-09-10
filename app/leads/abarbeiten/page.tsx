'use client';

import { Suspense } from 'react';
import { PageContainer } from '@/components/page-container';
import { WorkInbox } from '@/components/leads/work-inbox';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeadsAbarbeitenPage() {
  return (
    <PageContainer fill>
      <Suspense fallback={<Skeleton className="h-full min-h-64 w-full rounded-lg" />}>
        <WorkInbox />
      </Suspense>
    </PageContainer>
  );
}
