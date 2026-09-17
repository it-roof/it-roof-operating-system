'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayIcon, SquareIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimer } from '@/lib/timer-context';
import { type Task, type TrackerProject } from '@/lib/types';
import { fmtHms } from '@/lib/time-entry-utils';
import { ProjectPicker } from '@/components/project-picker';
import { ensureTask } from '@/lib/ensure-task';

export type { TrackerProject };

type Props = {
  tasks: Task[];
  projects: TrackerProject[];
  onChanged: () => void;
};

export function TimeTrackerBar({ tasks, projects, onChanged }: Props) {
  const {
    userId,
    activeId,
    activeEntryId,
    activeTitle,
    liveSecs,
    startTask,
    stopTask,
    updateActiveTitle,
  } = useTimer();

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState(false);

  const running = !!activeId;
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : undefined;

  useEffect(() => {
    if (!userId) return;
    const last = localStorage.getItem(`cherry-os-last-project:${userId}`);
    if (last) setProjectId(last);
  }, [userId]);

  useEffect(() => {
    if (!activeId) return;
    if (activeTask) {
      setTitle(activeTask.title);
      setProjectId(activeTask.project_id);
      return;
    }
    if (activeTitle) setTitle(activeTitle);
  }, [activeId, activeTask, activeTitle]);

  function rememberProject(id: string) {
    setProjectId(id);
    if (userId) localStorage.setItem(`cherry-os-last-project:${userId}`, id);
  }

  async function handleStop() {
    await stopTask();
    onChanged();
  }

  async function handleStart() {
    const trimmed = title.trim();
    if (!trimmed || !projectId || busy) return;
    setBusy(true);
    try {
      const id = await ensureTask(trimmed, projectId, tasks);
      if (!id) return;
      await startTask(id, trimmed);
      rememberProject(projectId);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleTitleBlur() {
    const trimmed = title.trim();
    if (!running || !activeId || !trimmed) return;
    if (trimmed === (activeTitle ?? activeTask?.title)) return;
    updateActiveTitle(trimmed);
    if (activeEntryId) {
      await fetch(`/api/time-entries/${activeEntryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
    }
    onChanged();
  }

  async function handleProjectChange(nextId: string) {
    rememberProject(nextId);
    if (!running || !activeEntryId || nextId === activeTask?.project_id) return;
    await fetch(`/api/time-entries/${activeEntryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: nextId }),
    });
    onChanged();
  }

  return (
    <div
      className={cn(
        'mb-8 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10',
        running && 'ring-primary/30',
      )}
    >
      <div className="flex flex-col md:flex-row md:items-stretch">
        <Input
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            if (running) updateActiveTitle(e.target.value);
          }}
          onBlur={handleTitleBlur}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (running) {
              void handleTitleBlur();
              return;
            }
            void handleStart();
          }}
          placeholder="Woran arbeitest du gerade?"
          className="h-12 flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:border-0 focus-visible:ring-0 md:h-12"
        />

        <div className="flex items-center gap-1 border-t border-border/60 px-2 py-1.5 md:border-t-0 md:px-1">
          <ProjectPicker
            projects={projects}
            value={projectId}
            onChange={id => void handleProjectChange(id)}
            className="h-9 max-w-[14rem]"
          />
        </div>

        <div className="flex items-center gap-3 border-t border-border/60 pl-3 md:border-t-0 md:pl-2">
          <span className="min-w-[4.75rem] text-center font-mono text-sm font-semibold tabular-nums">
            {fmtHms(running ? liveSecs : 0)}
          </span>
          {running ? (
            <Button
              type="button"
              variant="warning"
              className="h-12 flex-1 rounded-none rounded-b-xl px-6 md:flex-none md:rounded-none md:rounded-r-xl"
              onClick={() => void handleStop()}
            >
              <SquareIcon className="size-3.5" />
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              className="h-12 flex-1 rounded-none rounded-b-xl px-6 uppercase tracking-wide md:flex-none md:rounded-none md:rounded-r-xl"
              disabled={busy || !title.trim() || !projectId}
              onClick={() => void handleStart()}
            >
              <PlayIcon className="size-3.5" />
              {busy ? 'Start…' : 'Start'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
