'use client';

import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { SearchQueriesTab } from '@/components/leads/search-queries-tab';

export default function LeadsSuchenPage() {
  return (
    <PageContainer>
      <PageHeader title="Suchen" subtitle="search_query · CRUD" />
      <SearchQueriesTab />
    </PageContainer>
  );
}
