'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDownIcon, MailIcon, PhoneIcon } from 'lucide-react';

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-4 pb-24">
        <div className="pt-8 pb-4 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-semibold">Kunden</h1>
            <p className="text-xs text-muted-foreground">{companies.length} Firmen</p>
          </div>
        </div>

        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Firma oder Kontakt suchen…" className="mb-4" />

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Firmen gefunden.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(c => (
              <Collapsible key={c.id}>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <CollapsibleTrigger className="group w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      {c.city && <p className="text-xs text-muted-foreground mt-0.5">{c.city}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.contacts.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{c.contacts.length}</Badge>
                      )}
                      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-border px-4 py-3 flex flex-col gap-3">
                      {c.contacts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Keine Ansprechpartner hinterlegt.</p>
                      ) : c.contacts.map(ct => (
                        <div key={ct.id} className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{ct.first_name} {ct.last_name}</p>
                            {ct.email && <p className="text-xs text-muted-foreground mt-0.5">{ct.email}</p>}
                            {ct.phone && <p className="text-xs text-muted-foreground">{ct.phone}</p>}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            {ct.phone && (
                              <Button variant="outline" size="icon-sm" asChild>
                                <a href={`tel:${ct.phone}`}><PhoneIcon className="size-3.5" /></a>
                              </Button>
                            )}
                            {ct.email && (
                              <Button size="icon-sm" asChild>
                                <a href={`mailto:${ct.email}`}><MailIcon className="size-3.5" /></a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
