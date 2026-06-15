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

type Props = {
  onReopen: (id: string) => void;
};

export function DoneAccordion({ onReopen }: Props) {
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
      className="mt-2"
      onValueChange={(v) => { if (v === 'done') load(); }}
    >
      <AccordionItem value="done" className="border-0">
        <AccordionTrigger className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:no-underline py-0 mb-1">
          Abgeschlossen
        </AccordionTrigger>
        <AccordionContent className="pb-0">
          <div className="flex flex-col">
            {tasks.length === 0 && loaded && (
              <p className="text-sm text-muted-foreground">Keine erledigten Aufgaben.</p>
            )}
            {tasks.map(t => (
              <div key={t.id} className="flex gap-3 items-start py-2.5 border-b border-border last:border-0">
                <span className="text-[10px] text-green-600 font-bold w-12 flex-shrink-0 pt-0.5">✓ Erledigt</span>
                <div className="flex-1 min-w-0 opacity-60">
                  <p className="text-sm line-through text-muted-foreground leading-snug">{t.title}</p>
                  {t.firma && <p className="text-xs text-muted-foreground mt-0.5">{t.firma}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {t.zeit_minuten != null && (
                    <span className="text-xs text-muted-foreground opacity-60">{fmtMin(t.zeit_minuten)}</span>
                  )}
                  <Button size="icon-xs" variant="outline" onClick={() => handleReopen(t.id)} title="Wieder öffnen">
                    <RotateCcwIcon />
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
