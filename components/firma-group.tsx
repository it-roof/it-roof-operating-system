'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';
import { TaskRow } from '@/components/task-row';
import { type Task, type SharedProps } from '@/lib/types';
import { fmtMin } from '@/lib/task-utils';
import { useTimer } from '@/lib/timer-context';

export function FirmaGroup({ firma, tasks, ...rest }: { firma: string; tasks: Task[] } & SharedProps) {
  const [open, setOpen] = useState(true);
  const { getTaskSecs } = useTimer();
  const total = tasks.reduce((s, t) => s + Math.round(getTaskSecs(t.id) / 60) + (t.zeit_minuten ?? 0), 0);
  const hasHigh = tasks.some(t => t.prio === 'high');

  return (
    <Card className="mb-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors">
          <span className="text-sm font-semibold">{firma}</span>
          <div className="flex items-center gap-2">
            {hasHigh && <span className="w-1.5 h-1.5 rounded-full bg-foreground inline-block" />}
            <Badge variant="secondary" className="text-xs">
              {tasks.length}{total ? ` · ${fmtMin(total)}` : ''}
            </Badge>
            <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border">
            {tasks.map(t => <TaskRow key={t.id} task={t} compact {...rest} />)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
