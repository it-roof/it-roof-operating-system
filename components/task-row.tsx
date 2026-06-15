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
import { PRIO_DE, fmtSec, fmtMin } from '@/lib/task-utils';
import { useTimer } from '@/lib/timer-context';

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

  const prioCls = task.prio === 'high' ? 'text-foreground font-bold' : 'text-muted-foreground';

  return (
    <div className={`flex gap-3 items-start py-2.5 border-b border-border last:border-0 transition-colors
      ${compact ? 'px-4' : 'px-0'}
      ${isRunning ? 'bg-green-500/5' : ''}`}>
      <span className={`text-[10px] w-12 flex-shrink-0 pt-0.5 ${prioCls}`}>
        {PRIO_DE[task.prio] ?? task.prio}
      </span>

      <div className="flex-1 min-w-0">
        <div ref={titleRef} onClick={handleTitleClick}
          className="text-sm leading-snug rounded cursor-text outline-none hover:bg-muted px-1 -mx-1 transition-colors focus:ring-2 focus:ring-ring"
          suppressContentEditableWarning>
          {task.title}
        </div>
        {!compact && task.firma && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {task.firma}{task.projekt && task.projekt !== 'Organisatorisches' ? ` · ${task.projekt}` : ''}
          </p>
        )}
        {compact && task.projekt && task.projekt !== 'Organisatorisches' && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.projekt}</p>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-1.5">
        {/* Zeitanzeige + Timer-Button */}
        {isRunning ? (
          <>
            <span className="text-sm font-bold tabular-nums text-green-600">{fmtSec(taskSecs)}</span>
            <Button size="xs" variant="outline" onClick={stopTask}>
              <SquareIcon /> Stop
            </Button>
          </>
        ) : taskSecs > 0 ? (
          <>
            <span className="text-xs text-muted-foreground tabular-nums">
              {taskSecs < 60 ? '< 1 Min' : fmtMin(Math.round(taskSecs / 60))}
            </span>
            <Button size="icon-xs" variant="outline" onClick={() => startTask(task.id, task.title)}
              disabled={isBusy} title="Timer fortsetzen">
              <PlayIcon />
            </Button>
          </>
        ) : (
          <>
            {task.zeit_minuten != null && (
              <span className="text-xs text-muted-foreground">{fmtMin(task.zeit_minuten)}</span>
            )}
            <Button size="icon-xs" variant="outline" onClick={() => startTask(task.id, task.title)}
              disabled={isBusy} title="Timer starten">
              <PlayIcon />
            </Button>
          </>
        )}

        {/* Erledigen — immer sichtbar */}
        <Button size="icon-xs" onClick={() => onDone(task.id)} title="Erledigt">
          <CheckIcon />
        </Button>

        {/* Löschen */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon-xs" variant="destructive" title="Löschen">
              <Trash2Icon />
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
              <AlertDialogAction onClick={() => onDelete(task.id)}>Löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
