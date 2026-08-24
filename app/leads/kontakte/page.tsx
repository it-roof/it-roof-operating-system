'use client';

import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { ContactsTab } from '@/components/leads/contacts-tab';

export default function LeadsKontaktePage() {
  return (
    <PageContainer>
      <PageHeader title="Kontakte" subtitle="lead_contact · CRUD" />
      <ContactsTab />
    </PageContainer>
  );
}
