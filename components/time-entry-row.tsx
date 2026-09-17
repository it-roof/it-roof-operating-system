'use client';

import { useEffect, useState } from 'react';
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
import { useTimer } from '@/lib/timer-context';
import { ProjectPicker } from '@/components/project-picker';
import {
  type TimeEntry,
  applyEndClock,
  dayKey,
  entryDuration,
  fmtClock,
  fmtHms,
  localDateKey,
  parseClock,
  parseHms,
  setLocalClock,
} from '@/lib/time-entry-utils';
import { type TrackerProject } from '@/lib/types';

type Props = {
  entry: TimeEntry;
  now: number;
  running: boolean;
  projects: TrackerProject[];
  onPlay: () => void;
  onStop: () => void;
  onDelete: () => void;
  onChanged: () => void;
};

export function TimeEntryRow({
  entry, now, running, projects, onPlay, onStop, onDelete, onChanged,
}: Props) {
  const { startTask, updateActiveTitle } = useTimer();
  const [title, setTitle] = useState(entry.title);
  const [startClock, setStartClock] = useState(fmtClock(entry.started_at));
  const [endClock, setEndClock] = useState(entry.stopped_at ? fmtClock(entry.stopped_at) : '');
  const [duration, setDuration] = useState(fmtHms(entryDuration(entry, now)));
  const [calOpen, setCalOpen] = useState(false);

  const secs = entryDuration(entry, now);

  useEffect(() => {
    setTitle(entry.title);
    setStartClock(fmtClock(entry.started_at));
    setEndClock(entry.stopped_at ? fmtClock(entry.stopped_at) : '');
  }, [entry.title, entry.started_at, entry.stopped_at]);

  useEffect(() => {
    if (running) setDuration(fmtHms(secs));
    else setDuration(fmtHms(entry.duration_seconds));
  }, [running, secs, entry.duration_seconds]);

  async function patch(body: Record<string, unknown>) {
    const r = await fetch(`/api/time-entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        started_at: entry.started_at,
        stopped_at: entry.stopped_at,
        ...body,
      }),
    });
    const data = await r.json();
    if (!r.ok) return;
    if (running && data?.entry?.started_at) {
      await startTask(entry.task_id, title.trim() || entry.title, new Date(data.entry.started_at).getTime());
    }
    if (running && typeof body.title === 'string') updateActiveTitle(body.title);
    onChanged();
  }

  async function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === entry.title) {
      setTitle(entry.title);
      return;
    }
    await patch({ title: trimmed });
  }

  async function commitStart() {
    const clock = parseClock(startClock);
    if (!clock) {
      setStartClock(fmtClock(entry.started_at));
      return;
    }
    const started_at = setLocalClock(entry.started_at, clock);
    if (started_at === entry.started_at) return;
    await patch({ started_at });
  }

  async function commitEnd() {
    if (running) return;
    const clock = parseClock(endClock);
    if (!clock) {
      setEndClock(entry.stopped_at ? fmtClock(entry.stopped_at) : '');
      return;
    }
    const stopped_at = applyEndClock(entry.started_at, clock);
    if (stopped_at === entry.stopped_at) return;
    await patch({ stopped_at });
  }

  async function commitDuration() {
    if (running) return;
    const next = parseHms(duration);
    if (next == null) {
      setDuration(fmtHms(entry.duration_seconds));
      return;
    }
    if (next === entry.duration_seconds) return;
    await patch({ duration_seconds: next });
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
          value={startClock}
          onChange={e => setStartClock(e.target.value)}
          onBlur={() => void commitStart()}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="h-8 w-[4.5rem] border-transparent bg-transparent px-1 text-center shadow-none focus-visible:border-input focus-visible:bg-background"
        />
        <span>–</span>
        <Input
          value={running ? '' : endClock}
          onChange={e => setEndClock(e.target.value)}
          onBlur={() => void commitEnd()}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          disabled={running}
          placeholder={running ? '' : '00:00'}
          className="h-8 w-[4.5rem] border-transparent bg-transparent px-1 text-center shadow-none focus-visible:border-input focus-visible:bg-background disabled:opacity-60"
        />
      </div>

      <Input
        value={duration}
        onChange={e => setDuration(e.target.value)}
        onBlur={() => void commitDuration()}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        disabled={running}
        className="h-8 w-[5.25rem] border-transparent bg-transparent px-1 text-right font-mono text-sm tabular-nums shadow-none focus-visible:border-input focus-visible:bg-background disabled:opacity-100"
      />

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={running ? onStop : onPlay}
      >
        {running ? <SquareIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <EllipsisVerticalIcon className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            disabled={entry.legacy}
            onClick={onDelete}
          >
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
