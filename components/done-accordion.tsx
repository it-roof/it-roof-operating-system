'use client';

import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { RotateCcwIcon } from 'lucide-react';
import { fmtMin } from '@/lib/task-utils';

type DoneTask = {
  id: string;
  title: string;
  firma: string;
  zeit_minuten: number | null;
  completed_at: string;
};

export function DoneAccordion({ onReopen }: { onReopen: (id: string) => void }) {
  const [tasks, setTasks] = useState<DoneTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    const r = await fetch('/api/tasks/done');
    setTasks(await r.json());
    setLoaded(true);
  }

  async function handleReopen(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id));
    onReopen(id);
  }

  return (
    <Accordion
      type="single"
      collapsible
      onValueChange={(v) => { if (v === 'done') load(); }}
    >
      <AccordionItem value="done" className="border-0">
        <AccordionTrigger className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-[0.15em] hover:no-underline hover:text-foreground py-2">
          Abgeschlossen
        </AccordionTrigger>
        <AccordionContent className="pb-0 pt-1">
          {tasks.length === 0 && loaded && (
            <p className="text-sm text-muted-foreground py-2">Keine erledigten Aufgaben.</p>
          )}
          <div className="flex flex-col divide-y divide-border/60">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0 opacity-40">
                  <p className="text-sm line-through text-muted-foreground leading-snug truncate">{t.title}</p>
                  {t.firma && (
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{t.firma}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {t.zeit_minuten != null && (
                    <span className="text-[11px] font-mono text-muted-foreground/60">{fmtMin(t.zeit_minuten)}</span>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => handleReopen(t.id)}
                    className="size-8 text-muted-foreground hover:text-foreground">
                    <RotateCcwIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
