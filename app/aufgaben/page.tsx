'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { type SharedProps } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/page-container';
import { ProjektGroup } from '@/components/projekt-group';
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
    t.firma.toLowerCase().includes(search.toLowerCase()) ||
    t.projekt.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, { firma: string; tasks: Task[] }>>((acc, t) => {
    const k = t.projekt || 'Kein Projekt';
    if (!acc[k]) acc[k] = { firma: t.firma || '', tasks: [] };
    acc[k].tasks.push(t);
    return acc;
  }, {});

  const sharedProps = { onDone: doneTask, onSaveTitle: saveTitle, onDelete: deleteTask };

  return (
    <PageContainer>
        <PageHeader
          title="Aufgaben"
          subtitle={`${tasks.length} offen`}
          onAdd={() => setSheetOpen(true)}
        />

        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Suchen…" className="mb-4 h-10" />

        <div className="flex gap-1.5 mb-6 flex-wrap">
          {(['all', 'high', 'medium', 'low'] as const).map(p => {
            const activeClass =
              p === 'high'   ? 'bg-danger text-danger-foreground border-danger' :
              p === 'medium' ? 'bg-warning text-warning-foreground border-warning' :
              p === 'low'    ? 'bg-muted text-foreground border-border' :
                               'bg-primary text-primary-foreground border-primary';
            return (
              <button
                key={p}
                onClick={() => setActivePrio(p)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-mono font-medium tracking-wide transition-all duration-150 border ${
                  activePrio === p
                    ? activeClass
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {p === 'all' ? 'Alle' : PRIO_DE[p]}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[80, 60, 70].map(w => <Skeleton key={w} className="h-14 rounded-xl" style={{ width: `${w}%` }} />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Aufgaben gefunden.</p>
        ) : (
          Object.entries(grouped)
            .sort(([a, { tasks: at }], [b, { tasks: bt }]) => {
              const aH = at.some(t => t.prio === 'high') ? 0 : 1;
              const bH = bt.some(t => t.prio === 'high') ? 0 : 1;
              return aH !== bH ? aH - bH : a.localeCompare(b, 'de');
            })
            .map(([projekt, { firma, tasks: ts }]) => (
              <ProjektGroup key={projekt} projekt={projekt} firma={firma} tasks={ts} {...sharedProps} />
            ))
        )}

      <NewTaskSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreated={load} />
    </PageContainer>
  );
}
