'use client';

import { PageContainer } from '@/components/page-container';
import { WorkInbox } from '@/components/leads/work-inbox';

export default function LeadsInboxPage() {
  return (
    <PageContainer fill>
      <WorkInbox />
    </PageContainer>
  );
}
