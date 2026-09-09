'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';

type Project = { id: string; name: string; company_id: string | null; firma: string | null };

export default function ProjektePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.firma ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Project[]>>((acc, p) => {
    const k = p.firma ?? 'Ohne Firma';
    if (!acc[k]) acc[k] = [];
    acc[k].push(p);
    return acc;
  }, {});

  return (
    <PageContainer>
        <PageHeader
          title="Projekte"
          subtitle={`${projects.length} Projekte`}
        />

        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Projekt oder Firma suchen…"
          className="mb-5 h-10"
        />

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Keine Projekte gefunden.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b, 'de'))
              .map(([firma, ps]) => (
                <div key={firma}>
                  <p className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-[0.15em] mb-3">
                    {firma}
                  </p>
                  <div className="flex flex-col divide-y divide-border/60">
                    {ps.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-3">
                        <p className="text-sm">{p.name}</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
    </PageContainer>
  );
}
