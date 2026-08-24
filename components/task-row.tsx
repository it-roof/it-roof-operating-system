'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PlayIcon, SquareIcon, CheckIcon, Trash2Icon } from 'lucide-react';
import { type Task, type SharedProps } from '@/lib/types';
import { fmtSec, fmtMin } from '@/lib/task-utils';
import { useTimer } from '@/lib/timer-context';

const PRIO_BAR: Record<string, string> = {
  high: 'bg-danger',
  medium: 'bg-warning',
  low: 'bg-transparent',
};

const PRIO_ROW_BG: Record<string, string> = {
  high: 'bg-danger/5',
  medium: 'bg-warning/5',
  low: '',
};

export function TaskRow({ task, compact, onDone, onSaveTitle, onDelete }:
  { task: Task; compact?: boolean } & SharedProps) {
  const { activeId, startTask, stopTask, getTaskSecs } = useTimer();
  const isRunning = activeId === task.id;
  const isBusy = !!activeId && !isRunning;
  const taskSecs = getTaskSecs(task.id);
  const titleRef = useRef<HTMLDivElement>(null);

  function handleTitleClick() {
    const el = titleRef.current;
    if (!el || el.contentEditable === 'true') return;
    el.contentEditable = 'true';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    const original = el.textContent ?? '';
    el.onkeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.textContent = original; el.blur(); }
    };
    el.onblur = () => {
      el.contentEditable = 'false';
      el.onkeydown = null; el.onblur = null;
      const newTitle = (el.textContent ?? '').trim();
      if (newTitle && newTitle !== original) onSaveTitle(task.id, newTitle);
      else el.textContent = original;
    };
  }

  const subtitle = compact
    ? (task.projekt && task.projekt !== 'Organisatorisches' ? task.projekt : null)
    : [task.firma, task.projekt && task.projekt !== 'Organisatorisches' ? task.projekt : null]
        .filter(Boolean).join(' · ') || null;

  const rowBg = isRunning ? 'bg-primary/5' : (PRIO_ROW_BG[task.prio] ?? '');

  return (
    <div className={`flex gap-0 items-stretch min-h-[52px] rounded-sm transition-colors ${rowBg}`}>
      {/* Priority accent */}
      <div className={`w-[3px] rounded-full flex-shrink-0 my-2.5 mr-3 ${PRIO_BAR[task.prio] ?? 'bg-transparent'}`} />

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-3">
        <div
          ref={titleRef}
          onClick={handleTitleClick}
          className="text-sm leading-snug rounded cursor-text outline-none hover:bg-muted/80 px-1 -mx-1 transition-colors focus:ring-2 focus:ring-ring"
          suppressContentEditableWarning
        >
          {task.title}
        </div>
        {subtitle && (
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5 tracking-wide">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-0.5 pl-2">
        {isRunning ? (
          <>
            <span className="text-xs font-mono font-bold tabular-nums mr-1.5">
              {fmtSec(taskSecs)}
            </span>
            <Button size="icon" variant="warning" onClick={stopTask} className="size-8">
              <SquareIcon className="size-3.5" />
            </Button>
          </>
        ) : (
          <>
            {taskSecs > 0 ? (
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums mr-1">
                {taskSecs < 60 ? '<1m' : fmtMin(Math.round(taskSecs / 60))}
              </span>
            ) : task.zeit_minuten != null ? (
              <span className="text-[11px] font-mono text-muted-foreground mr-1">{fmtMin(task.zeit_minuten)}</span>
            ) : null}
            <Button size="icon" variant="ghost"
              onClick={() => startTask(task.id, task.title)}
              disabled={isBusy}
              className="size-8 text-muted-foreground hover:text-foreground">
              <PlayIcon className="size-3.5" />
            </Button>
          </>
        )}

        <Button size="icon" variant="success" onClick={() => onDone(task.id)} className="size-8">
          <CheckIcon className="size-3.5" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost"
              className="size-8 text-muted-foreground/40 hover:text-danger hover:bg-danger/10">
              <Trash2Icon className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                „{task.title}" wird unwiderruflich gelöscht.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction variant="danger-solid" onClick={() => onDelete(task.id)}>Löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
