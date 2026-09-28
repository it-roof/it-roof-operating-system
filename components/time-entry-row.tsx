'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarIcon, EllipsisVerticalIcon, PlayIcon, SquareIcon } from 'lucide-react';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTimer, useTimerTick } from '@/lib/timer-context';
import { ProjectPicker } from '@/components/project-picker';
import {
  type TimeEntry,
  dayKey,
  fmtClock,
  fmtHms,
  localDateKey,
  parseClock,
  parseHms,
  setLocalClock,
  stoppedAtFromClock,
} from '@/lib/time-entry-utils';
import { type TrackerProject } from '@/lib/types';

type Props = {
  entry: TimeEntry;
  running: boolean;
  projects: TrackerProject[];
  onPlay: (entry: TimeEntry) => void;
  onStop: () => void;
  onDelete: (entry: TimeEntry) => void;
  onPatched: (entry: TimeEntry) => void;
};

export const TimeEntryRow = memo(function TimeEntryRow({
  entry, running, projects, onPlay, onStop, onDelete, onPatched,
}: Props) {
  const { pending, updateActiveTitle, syncRunningStartedAt, beginTimerEdit, endTimerEdit } = useTimer();
  const [title, setTitle] = useState(entry.title);
  const [startClock, setStartClock] = useState(fmtClock(entry.started_at));
  const [endClock, setEndClock] = useState(entry.stopped_at ? fmtClock(entry.stopped_at) : '');
  const [duration, setDuration] = useState(fmtHms(entry.duration_seconds));
  const [calOpen, setCalOpen] = useState(false);
  const editing = useRef(false);
  const fieldEdits = useRef(0);
  const patchChain = useRef(Promise.resolve());
  const titleRef = useRef(title);
  titleRef.current = title;

  useEffect(() => {
    return () => {
      if (editing.current) {
        editing.current = false;
        fieldEdits.current = 0;
        endTimerEdit();
      }
    };
  }, [endTimerEdit]);

  useEffect(() => {
    if (editing.current) return;
    setTitle(entry.title);
    setStartClock(fmtClock(entry.started_at));
    setEndClock(entry.stopped_at ? fmtClock(entry.stopped_at) : '');
    if (!running) setDuration(fmtHms(entry.duration_seconds));
  }, [entry.id, entry.title, entry.started_at, entry.stopped_at, entry.duration_seconds, running]);

  async function patch(body: Record<string, unknown>) {
    const run = patchChain.current.then(async () => {
      const r = await fetch(`/api/time-entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => null) as { entry?: TimeEntry } | null;
      if (!r.ok || !data?.entry) return false;
      if (running && typeof body.title === 'string') updateActiveTitle(body.title);
      if (running && (body.started_at !== undefined || body.date !== undefined)) {
        syncRunningStartedAt(new Date(data.entry.started_at).getTime());
      }
      onPatched(data.entry);
      return true;
    });
    patchChain.current = run.then(() => undefined, () => undefined);
    return run.catch(() => false);
  }

  function finishEdit() {
    fieldEdits.current = Math.max(0, fieldEdits.current - 1);
    if (fieldEdits.current > 0) return;
    if (!editing.current) return;
    editing.current = false;
    endTimerEdit();
  }

  async function commitTitle() {
    const trimmed = titleRef.current.trim();
    if (!trimmed) {
      setTitle(entry.title);
      finishEdit();
      return;
    }
    if (trimmed === entry.title) {
      finishEdit();
      return;
    }
    const ok = await patch({ title: trimmed });
    if (!ok) setTitle(entry.title);
    finishEdit();
  }

  async function commitStartValue(raw: string) {
    const clock = parseClock(raw);
    if (!clock) return false;
    const started_at = setLocalClock(entry.started_at, clock);
    if (fmtClock(started_at) === fmtClock(entry.started_at)) return true;
    const ok = await patch({ started_at });
    if (!ok) setStartClock(fmtClock(entry.started_at));
    return ok;
  }

  async function commitStart() {
    const clock = parseClock(startClock);
    if (!clock) {
      setStartClock(fmtClock(entry.started_at));
      finishEdit();
      return;
    }
    await commitStartValue(startClock);
    finishEdit();
  }

  async function commitEnd() {
    if (running) {
      finishEdit();
      return;
    }
    const clock = parseClock(endClock);
    if (!clock) {
      setEndClock(entry.stopped_at ? fmtClock(entry.stopped_at) : '');
      finishEdit();
      return;
    }
    const stopped_at = stoppedAtFromClock(entry.started_at, clock);
    if (entry.stopped_at && new Date(stopped_at).getTime() === new Date(entry.stopped_at).getTime()) {
      finishEdit();
      return;
    }
    const ok = await patch({ stopped_at });
    if (!ok) setEndClock(entry.stopped_at ? fmtClock(entry.stopped_at) : '');
    finishEdit();
  }

  async function commitDuration() {
    if (running) {
      finishEdit();
      return;
    }
    const next = parseHms(duration);
    if (next == null) {
      setDuration(fmtHms(entry.duration_seconds));
      finishEdit();
      return;
    }
    if (next === entry.duration_seconds) {
      finishEdit();
      return;
    }
    const ok = await patch({ duration_seconds: next });
    if (!ok) setDuration(fmtHms(entry.duration_seconds));
    finishEdit();
  }

  function startEdit() {
    fieldEdits.current += 1;
    if (editing.current) return;
    editing.current = true;
    beginTimerEdit();
  }

  async function handlePlayStop() {
    if (pending) return;
    if (running) {
      if (titleRef.current.trim() && titleRef.current.trim() !== entry.title) {
        await patch({ title: titleRef.current.trim() });
      }
      await commitStartValue(startClock);
      onStop();
      return;
    }
    onPlay(entry);
  }

  const selectedDay = new Date(entry.started_at);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3',
        running && 'bg-primary/5',
      )}
    >
      <div className="min-w-0 flex-1">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={startEdit}
          onBlur={() => void commitTitle()}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="h-8 border-transparent bg-transparent px-1 shadow-none focus-visible:border-input focus-visible:bg-background"
        />
        <ProjectPicker
          projects={projects}
          value={entry.project_id}
          onChange={id => void patch({ project_id: id })}
          className="mt-0.5 h-7 max-w-full px-1"
        />
      </div>

      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            title="Datum ändern"
          >
            <CalendarIcon className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            locale={de}
            selected={selectedDay}
            onSelect={day => {
              if (!day) return;
              setCalOpen(false);
              const ymd = dayKey(day);
              if (ymd === localDateKey(entry.started_at)) return;
              void patch({ date: ymd });
            }}
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1 font-mono text-[13px] tabular-nums text-muted-foreground">
        <Input
          type="time"
          value={startClock}
          onChange={e => {
            setStartClock(e.target.value);
            if (e.target.value) void commitStartValue(e.target.value);
          }}
          onFocus={startEdit}
          onBlur={() => void commitStart()}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          title="Startzeit"
          className="h-8 w-[6.5rem] border-transparent bg-transparent px-1 text-center font-mono shadow-none focus-visible:border-input focus-visible:bg-background"
        />
        <span>–</span>
        <Input
          value={running ? '' : endClock}
          onChange={e => setEndClock(e.target.value)}
          onFocus={startEdit}
          onBlur={() => void commitEnd()}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          disabled={running}
          placeholder={running ? '' : '00:00'}
          className="h-8 w-[4.5rem] border-transparent bg-transparent px-1 text-center shadow-none focus-visible:border-input focus-visible:bg-background disabled:opacity-60"
        />
      </div>

      {running ? (
        <RunningDuration startedAt={entry.started_at} />
      ) : (
        <Input
          value={duration}
          onChange={e => setDuration(e.target.value)}
          onFocus={startEdit}
          onBlur={() => void commitDuration()}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="h-8 w-[5.25rem] border-transparent bg-transparent px-1 text-right font-mono text-sm tabular-nums shadow-none focus-visible:border-input focus-visible:bg-background"
        />
      )}

      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={pending}
        className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => void handlePlayStop()}
      >
        {running ? <SquareIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={pending}
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <EllipsisVerticalIcon className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            disabled={entry.legacy || pending}
            onClick={() => onDelete(entry)}
          >
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

function RunningDuration({ startedAt }: { startedAt: string }) {
  const { now } = useTimerTick();
  const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return (
    <span className="h-8 w-[5.25rem] px-1 text-right font-mono text-sm tabular-nums leading-8">
      {fmtHms(secs)}
    </span>
  );
}
