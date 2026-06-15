'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-4 pb-24">
        <div className="pt-8 pb-4">
          <h1 className="text-lg font-semibold">Projekte</h1>
          <p className="text-xs text-muted-foreground">{projects.length} Projekte</p>
        </div>

        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Projekt oder Firma suchen…" className="mb-4" />

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Projekte gefunden.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b, 'de'))
              .map(([firma, ps]) => (
                <Card key={firma}>
                  <CardHeader className="py-2.5 px-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{firma}</p>
                      <Badge variant="secondary" className="text-xs">{ps.length}</Badge>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="p-0">
                    {ps.map((p, i) => (
                      <div key={p.id}>
                        <div className="px-4 py-3 flex items-center justify-between">
                          <p className="text-sm">{p.name}</p>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        </div>
                        {i < ps.length - 1 && <Separator />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
