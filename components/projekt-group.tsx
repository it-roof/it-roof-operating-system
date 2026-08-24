'use client';

import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { TaskRow } from '@/components/task-row';
import { type Task, type SharedProps } from '@/lib/types';
import { fmtMin } from '@/lib/task-utils';
import { useTimer } from '@/lib/timer-context';

type Props = {
  projekt: string;
  firma: string;
  tasks: Task[];
} & SharedProps;

export function ProjektGroup({ projekt, firma, tasks, ...rest }: Props) {
  const [open, setOpen] = useState(true);
  const { getTaskSecs } = useTimer();
  const total = tasks.reduce((s, t) => s + Math.round(getTaskSecs(t.id) / 60) + (t.zeit_minuten ?? 0), 0);
  const hasHigh = tasks.some(t => t.prio === 'high');

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2 text-left group"
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasHigh && <span className="w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight truncate">{projekt}</p>
            {firma && (
              <p className="text-[11px] text-muted-foreground leading-tight">{firma}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className="text-[10px] font-mono text-muted-foreground tracking-wide">
            {tasks.length} AUFG{total ? ` · ${fmtMin(total)}` : ''}
          </span>
          <ChevronDownIcon className={`size-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="flex flex-col divide-y divide-border/60 pl-1 border-l-2 border-border/40 ml-0.5">
          {tasks.map(t => <TaskRow key={t.id} task={t} compact {...rest} />)}
        </div>
      )}
    </div>
  );
}
