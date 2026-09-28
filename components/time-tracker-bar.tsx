'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayIcon, SquareIcon, ClockIcon, ListPlusIcon, PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimer, useTimerTick } from '@/lib/timer-context';
import { type Task, type TrackerProject } from '@/lib/types';
import { fmtHms, fmtClock, parseClock, setLocalClock, stoppedAtFromClock, combineLocal, localDateKey, secondsBetween, type TimeEntry } from '@/lib/time-entry-utils';
import { ProjectPicker } from '@/components/project-picker';
import { ensureTask } from '@/lib/ensure-task';

export type { TrackerProject };

type Props = {
  tasks: Task[];
  projects: TrackerProject[];
  onChanged: () => void;
  onEntryPatched: (entry: TimeEntry) => void;
};

export function TimeTrackerBar({ tasks, projects, onChanged, onEntryPatched }: Props) {
  const {
    userId,
    activeId,
    activeEntryId,
    activeTitle,
    pending,
    startedAtMs,
    startTask,
    stopTask,
    updateActiveTitle,
    beginTimerEdit,
    endTimerEdit,
    registerRunningFlush,
    syncRunningStartedAt,
  } = useTimer();

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startClock, setStartClock] = useState('');
  const [endClock, setEndClock] = useState('');
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const [saving, setSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const titleFocused = useRef(false);
  const startFocused = useRef(false);
  const titleRef = useRef('');
  const lastEntryId = useRef<string | null>(null);
  const lastProjectFor = useRef<string | null>(null);
  const busy = useRef(false);
  const titleDirty = useRef(false);
  const startClockRef = useRef(startClock);
  startClockRef.current = startClock;

  const running = !!activeId;
  const manual = !running && mode === 'manual';
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : undefined;
  titleRef.current = title;

  useEffect(() => {
    if (!userId) return;
    const last = localStorage.getItem(`cherry-os-last-project:${userId}`);
    if (last) setProjectId(last);
  }, [userId]);

  useEffect(() => {
    if (!activeEntryId) {
      lastEntryId.current = null;
      lastProjectFor.current = null;
      return;
    }
    if (activeEntryId !== lastEntryId.current) {
      const keepDraft = !lastEntryId.current && titleFocused.current && titleRef.current.trim().length > 0;
      lastEntryId.current = activeEntryId;
      if (!keepDraft) {
        titleDirty.current = false;
        setTitle(activeTitle ?? '');
      }
      return;
    }
    if (titleFocused.current || titleDirty.current) return;
    const next = activeTitle ?? '';
    setTitle(prev => (prev === next ? prev : next));
  }, [activeEntryId, activeTitle]);

  useEffect(() => {
    if (!activeEntryId || !activeTask) return;
    if (lastProjectFor.current === activeEntryId) return;
    lastProjectFor.current = activeEntryId;
    setProjectId(activeTask.project_id);
  }, [activeEntryId, activeTask]);

  useEffect(() => {
    if (!startedAtMs || startFocused.current) return;
    setStartClock(fmtClock(new Date(startedAtMs).toISOString()));
  }, [startedAtMs]);

  useEffect(() => {
    return () => {
      if (titleFocused.current) {
        titleFocused.current = false;
        endTimerEdit();
      }
      if (startFocused.current) {
        startFocused.current = false;
        endTimerEdit();
      }
    };
  }, [endTimerEdit]);

  function rememberProject(id: string) {
    setProjectId(id);
    if (userId) localStorage.setItem(`cherry-os-last-project:${userId}`, id);
  }

  async function persistTitle() {
    const trimmed = titleRef.current.trim();
    if (!running || !activeEntryId || !trimmed) return false;
    if (trimmed === activeTitle) {
      titleDirty.current = false;
      return false;
    }
    const previous = activeTitle;
    updateActiveTitle(trimmed);
    const r = await fetch(`/api/time-entries/${activeEntryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
    if (!r.ok) {
      if (previous != null) updateActiveTitle(previous);
      return false;
    }
    titleDirty.current = false;
    const data = await r.json().catch(() => null) as { entry?: TimeEntry } | null;
    if (data?.entry) onEntryPatched(data.entry);
    return true;
  }

  async function persistStart(raw: string) {
    const clock = parseClock(raw);
    if (!running || !activeEntryId || !startedAtMs || !clock) return;
    const started_at = setLocalClock(new Date(startedAtMs).toISOString(), clock);
    if (fmtClock(started_at) === fmtClock(new Date(startedAtMs).toISOString())) return;
    const r = await fetch(`/api/time-entries/${activeEntryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ started_at }),
    });
    if (!r.ok) {
      setStartClock(fmtClock(new Date(startedAtMs).toISOString()));
      return;
    }
    const data = await r.json().catch(() => null) as { entry?: TimeEntry } | null;
    if (data?.entry?.started_at) {
      syncRunningStartedAt(new Date(data.entry.started_at).getTime());
      onEntryPatched(data.entry);
    }
  }

  const flushRunningEdits = useRef(async () => {});
  flushRunningEdits.current = async () => {
    if (titleDirty.current) await persistTitle();
    if (startClockRef.current) await persistStart(startClockRef.current);
  };

  useEffect(() => {
    registerRunningFlush(() => flushRunningEdits.current());
    return () => registerRunningFlush(null);
  }, [registerRunningFlush]);

  async function handleStop() {
    if (pending || busy.current) return;
    busy.current = true;
    try {
      await stopTask();
      onChanged();
    } finally {
      busy.current = false;
    }
  }

  async function handleStart() {
    const trimmed = title.trim();
    if (!trimmed || !projectId || pending || running || busy.current) return;
    busy.current = true;
    try {
      const id = await ensureTask(trimmed, projectId, tasks);
      if (!id) return;
      await startTask(id, trimmed);
      rememberProject(projectId);
      onChanged();
    } catch {
      // Start bleibt aus, Eingabe bleibt stehen
    } finally {
      busy.current = false;
    }
  }

  async function handleTitleBlur() {
    titleFocused.current = false;
    const trimmed = title.trim();
    if (!running) {
      endTimerEdit();
      return;
    }
    if (!trimmed) {
      titleDirty.current = false;
      setTitle(activeTitle || activeTask?.title || '');
      endTimerEdit();
      return;
    }
    await persistTitle();
    endTimerEdit();
  }

  function fillManualClocks() {
    const now = new Date();
    setEndClock(fmtClock(now.toISOString()));
    setStartClock(fmtClock(new Date(now.getTime() - 60 * 60 * 1000).toISOString()));
  }

  function switchMode(next: 'timer' | 'manual') {
    setMode(next);
    setManualError(null);
    if (next === 'manual') fillManualClocks();
  }

  function manualDurationLabel() {
    const sc = parseClock(startClock);
    const ec = parseClock(endClock);
    if (!sc || !ec) return '00:00:00';
    const day = localDateKey(new Date());
    const started = combineLocal(day, sc);
    const stopped = stoppedAtFromClock(started, ec);
    return fmtHms(secondsBetween(started, stopped));
  }

  async function handleManual() {
    const trimmed = title.trim();
    const sc = parseClock(startClock);
    const ec = parseClock(endClock);
    if (!trimmed || !projectId || !sc || !ec || pending || running || busy.current) return;
    busy.current = true;
    setSaving(true);
    setManualError(null);
    try {
      const id = await ensureTask(trimmed, projectId, tasks);
      if (!id) {
        setManualError('Aufgabe konnte nicht angelegt werden.');
        return;
      }
      const day = localDateKey(new Date());
      const started_at = combineLocal(day, sc);
      const stopped_at = stoppedAtFromClock(started_at, ec);
      const r = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: id, title: trimmed, started_at, stopped_at }),
      });
      if (!r.ok) {
        setManualError('Eintrag konnte nicht gespeichert werden.');
        return;
      }
      rememberProject(projectId);
      setTitle('');
      fillManualClocks();
      onChanged();
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function handleProjectChange(nextId: string) {
    const prev = projectId;
    rememberProject(nextId);
    if (!running || !activeEntryId || nextId === activeTask?.project_id) return;
    lastProjectFor.current = activeEntryId;
    const r = await fetch(`/api/time-entries/${activeEntryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: nextId }),
    });
    if (!r.ok) {
      setProjectId(prev);
      lastProjectFor.current = null;
      return;
    }
    const data = await r.json().catch(() => null) as { entry?: TimeEntry } | null;
    if (data?.entry) onEntryPatched(data.entry);
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
            titleDirty.current = true;
            setTitle(e.target.value);
          }}
          onFocus={() => {
            if (titleFocused.current) return;
            titleFocused.current = true;
            beginTimerEdit();
          }}
          onBlur={() => void handleTitleBlur()}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (running) {
              e.currentTarget.blur();
              return;
            }
            if (manual) {
              void handleManual();
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
          {!running && (
            <div className="flex rounded-md ring-1 ring-foreground/10">
              <Button
                type="button"
                size="icon"
                variant={mode === 'timer' ? 'secondary' : 'ghost'}
                className="size-9 rounded-r-none"
                title="Timer"
                onClick={() => switchMode('timer')}
              >
                <ClockIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={mode === 'manual' ? 'secondary' : 'ghost'}
                className="size-9 rounded-l-none"
                title="Zeit eintragen ohne Timer"
                onClick={() => switchMode('manual')}
              >
                <ListPlusIcon className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border/60 pl-3 md:border-t-0 md:pl-2">
          {running && (
            <Input
              type="time"
              value={startClock}
              onChange={e => {
                setStartClock(e.target.value);
                void persistStart(e.target.value);
              }}
              onFocus={() => {
                if (startFocused.current) return;
                startFocused.current = true;
                beginTimerEdit();
              }}
              onBlur={() => {
                startFocused.current = false;
                endTimerEdit();
                void persistStart(startClock);
              }}
              title="Startzeit"
              className="h-9 w-[6.5rem] rounded-md border-transparent bg-transparent px-1 font-mono text-sm shadow-none focus-visible:border-input focus-visible:bg-background"
            />
          )}
          {manual && (
            <>
              <Input
                type="time"
                value={startClock}
                onChange={e => setStartClock(e.target.value)}
                title="Von"
                className="h-9 w-[6.5rem] rounded-md border-transparent bg-transparent px-1 font-mono text-sm shadow-none focus-visible:border-input focus-visible:bg-background"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="time"
                value={endClock}
                onChange={e => setEndClock(e.target.value)}
                title="Bis"
                className="h-9 w-[6.5rem] rounded-md border-transparent bg-transparent px-1 font-mono text-sm shadow-none focus-visible:border-input focus-visible:bg-background"
              />
            </>
          )}
          <span className="min-w-[4.75rem] text-center font-mono text-sm font-semibold tabular-nums">
            {manual ? manualDurationLabel() : <TrackerClock running={running} />}
          </span>
          {running ? (
            <Button
              type="button"
              variant="warning"
              disabled={pending}
              className="h-12 flex-1 rounded-none rounded-b-xl px-6 md:flex-none md:rounded-none md:rounded-r-xl"
              onClick={() => void handleStop()}
            >
              <SquareIcon className="size-3.5" />
              Stop
            </Button>
          ) : manual ? (
            <Button
              type="button"
              disabled={pending || saving || !title.trim() || !projectId || !parseClock(startClock) || !parseClock(endClock)}
              className="h-12 flex-1 rounded-none rounded-b-xl px-6 md:flex-none md:rounded-none md:rounded-r-xl"
              onClick={() => void handleManual()}
            >
              <PlusIcon className="size-3.5" />
              {saving ? 'Speichern…' : 'Speichern'}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={pending || !title.trim() || !projectId}
              className="h-12 flex-1 rounded-none rounded-b-xl px-6 uppercase tracking-wide md:flex-none md:rounded-none md:rounded-r-xl"
              onClick={() => void handleStart()}
            >
              <PlayIcon className="size-3.5" />
              {pending ? 'Start…' : 'Start'}
            </Button>
          )}
        </div>
      </div>
      {manualError && (
        <p className="border-t border-border/60 px-4 py-2 text-sm text-danger">{manualError}</p>
      )}
    </div>
  );
}

function TrackerClock({ running }: { running: boolean }) {
  const { liveSecs } = useTimerTick();
  return <>{fmtHms(running ? liveSecs : 0)}</>;
}
