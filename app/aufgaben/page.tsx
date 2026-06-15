'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { type SharedProps } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { FirmaGroup } from '@/components/firma-group';
import { type Task } from '@/lib/types';
import { useTaskMutations } from '@/lib/use-task-mutations';
import NewTaskSheet from '@/components/new-task-sheet';

const PRIO_DE: Record<string, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' };

export default function AufgabenPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePrio, setActivePrio] = useState<string>('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  const { doneTask, deleteTask, saveTitle } = useTaskMutations(setTasks);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/tasks');
    setTasks(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  let filtered = tasks;
  if (activePrio !== 'all') filtered = filtered.filter(t => t.prio === activePrio);
  if (search) filtered = filtered.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.firma.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Task[]>>((acc, t) => {
    const k = t.firma || 'Keine Firma';
    if (!acc[k]) acc[k] = [];
    acc[k].push(t);
    return acc;
  }, {});

  const sharedProps = { onDone: doneTask, onSaveTitle: saveTitle, onDelete: deleteTask };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-xl mx-auto px-4 pb-24">
        <PageHeader
          title="Alle Aufgaben"
          subtitle={`${tasks.length} offen`}
          onRefresh={load}
          onAdd={() => setSheetOpen(true)}
        />

        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Suchen…" className="mb-3" />

        <div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'high', 'medium', 'low'] as const).map(p => (
            <Button key={p} size="sm" variant={activePrio === p ? 'default' : 'outline'}
              onClick={() => setActivePrio(p)}>
              {p === 'all' ? 'Alle' : PRIO_DE[p]}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[80, 60, 70].map(w => <Skeleton key={w} className="h-14 rounded-xl" style={{ width: `${w}%` }} />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Aufgaben gefunden.</p>
        ) : (
          Object.entries(grouped)
            .sort(([a, at], [b, bt]) => {
              const aH = at.some(t => t.prio === 'high') ? 0 : 1;
              const bH = bt.some(t => t.prio === 'high') ? 0 : 1;
              return aH !== bH ? aH - bH : a.localeCompare(b, 'de');
            })
            .map(([firma, ts]) => (
              <FirmaGroup key={firma} firma={firma} tasks={ts} {...sharedProps} />
            ))
        )}
      </div>

      <NewTaskSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreated={load} />
    </div>
  );
}
