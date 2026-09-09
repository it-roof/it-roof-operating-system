'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, MailIcon, PhoneIcon } from 'lucide-react';
import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';

type Contact = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null };
type Company = { id: string; name: string; city: string | null; contacts: Contact[] };

export default function KundenPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(data => {
      setCompanies(data);
      setLoading(false);
    });
  }, []);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contacts.some(ct => `${ct.first_name} ${ct.last_name}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageContainer>
        <PageHeader
          title="Kunden"
          subtitle={`${companies.length} Firmen`}
        />

        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Firma oder Kontakt suchen…"
          className="mb-5 h-10"
        />

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Keine Firmen gefunden.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {filtered.map(c => (
              <Collapsible key={c.id}>
                <CollapsibleTrigger className="group w-full flex items-center justify-between py-4 text-left">
                  <div>
                    <p className="text-sm font-semibold tracking-tight">{c.name}</p>
                    {c.city && (
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5 tracking-wide">{c.city}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {c.contacts.length > 0 && (
                      <span className="text-[11px] font-mono">{c.contacts.length}</span>
                    )}
                    <ChevronDownIcon className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="pb-4 flex flex-col gap-4 pl-1">
                    {c.contacts.length === 0 ? (
                      <p className="text-xs font-mono text-muted-foreground tracking-wide">Keine Ansprechpartner</p>
                    ) : c.contacts.map(ct => (
                      <div key={ct.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{ct.first_name} {ct.last_name}</p>
                          {ct.email && (
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate tracking-wide">
                              {ct.email}
                            </p>
                          )}
                          {ct.phone && (
                            <p className="text-[11px] font-mono text-muted-foreground tracking-wide">{ct.phone}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {ct.phone && (
                            <Button variant="outline" size="icon" className="size-8" asChild>
                              <a href={`tel:${ct.phone}`}><PhoneIcon className="size-3.5" /></a>
                            </Button>
                          )}
                          {ct.email && (
                            <Button size="icon" className="size-8" asChild>
                              <a href={`mailto:${ct.email}`}><MailIcon className="size-3.5" /></a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
    </PageContainer>
  );
}
