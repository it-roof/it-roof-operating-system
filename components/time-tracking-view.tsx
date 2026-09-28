'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimeTrackerBar } from '@/components/time-tracker-bar';
import { TimeEntryRow } from '@/components/time-entry-row';
import { TimeEntryDialog } from '@/components/time-entry-dialog';
import { useTimer, useTimerTick } from '@/lib/timer-context';
import { type Task, type TrackerProject } from '@/lib/types';
import {
  type TimeEntry,
  fmtHms,
  groupTimeEntries,
} from '@/lib/time-entry-utils';

type Props = {
  tasks: Task[];
  onCreated: () => void;
};

export function TimeTrackingView({ tasks, onCreated }: Props) {
  const { activeId, activeEntryId, pending, startTask, stopTask } = useTimer();
  const [projects, setProjects] = useState<TrackerProject[] | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [addDate, setAddDate] = useState<string | null>(null);
  const opLock = useRef(false);
  const loadSeq = useRef(0);

  const loadEntries = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const r = await fetch('/api/time-entries');
      if (!r.ok) return;
      const data = await r.json();
      if (seq !== loadSeq.current) return;
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      // Liste bleibt beim letzten Stand
    }
  }, []);

  const upsertEntry = useCallback((row: TimeEntry) => {
    setEntries(es => {
      const i = es.findIndex(e => e.id === row.id);
      if (i < 0) return [row, ...es];
      const cur = es[i]!;
      if (
        cur.title === row.title
        && cur.started_at === row.started_at
        && cur.stopped_at === row.stopped_at
        && cur.duration_seconds === row.duration_seconds
        && cur.project_id === row.project_id
      ) return es;
      const next = es.slice();
      next[i] = row;
      return next;
    });
  }, []);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((data: TrackerProject[]) => setProjects(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries, activeId]);

  function refresh() {
    onCreated();
    void loadEntries();
  }

  async function playEntry(entry: TimeEntry) {
    if (pending || opLock.current) return;
    opLock.current = true;
    try {
      await startTask(entry.task_id, entry.title, true);
      refresh();
    } finally {
      opLock.current = false;
    }
  }

  async function stopRunning() {
    if (pending || opLock.current) return;
    opLock.current = true;
    try {
      await stopTask();
      refresh();
    } finally {
      opLock.current = false;
    }
  }

  async function deleteEntry(entry: TimeEntry) {
    if (entry.legacy || pending || opLock.current) return;
    opLock.current = true;
    try {
      const wasRunning = entry.id === activeEntryId;
      const r = await fetch(`/api/time-entries/${entry.id}`, { method: 'DELETE' });
      if (!r.ok) return;
      if (wasRunning) await stopTask({ localOnly: true });
      refresh();
    } finally {
      opLock.current = false;
    }
  }

  const projectList = projects ?? [];

  return (
    <>
      <TimeTrackerBar
        tasks={tasks}
        projects={projectList}
        onChanged={refresh}
        onEntryPatched={upsertEntry}
      />

      {projects && projects.length === 0 && (
        <p className="mb-6 text-sm text-muted-foreground">
          Kein Projekt vorhanden. Lege zuerst ein Projekt an, dann kannst du die Zeit starten.
        </p>
      )}

      <TimeEntryWeeks
        entries={entries}
        projects={projectList}
        activeEntryId={activeEntryId}
        onPatched={upsertEntry}
        onPlay={playEntry}
        onStop={stopRunning}
        onDelete={deleteEntry}
        onAddDate={setAddDate}
      />

      <TimeEntryDialog
        open={!!addDate}
        date={addDate ?? ''}
        tasks={tasks}
        projects={projectList}
        onClose={() => setAddDate(null)}
        onSaved={refresh}
      />
    </>
  );
}

function TimeEntryWeeks({
  entries,
  projects,
  activeEntryId,
  onPatched,
  onPlay,
  onStop,
  onDelete,
  onAddDate,
}: {
  entries: TimeEntry[];
  projects: TrackerProject[];
  activeEntryId: string | null;
  onPatched: (entry: TimeEntry) => void;
  onPlay: (entry: TimeEntry) => void;
  onStop: () => void;
  onDelete: (entry: TimeEntry) => void;
  onAddDate: (date: string) => void;
}) {
  const { now } = useTimerTick();
  const weeks = groupTimeEntries(entries, now);

  return (
    <div className="flex flex-col gap-8">
      {weeks.map(week => (
        <section key={week.key}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">{week.label}</h2>
            <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
              Gesamte Woche{' '}
              <span className="ml-1 text-sm font-semibold text-foreground">{fmtHms(week.total)}</span>
            </p>
          </div>

          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            {week.days.map(day => (
              <div key={day.date} className="border-b border-border/60 last:border-b-0">
                <div className="flex items-center justify-between bg-muted/50 px-4 py-2">
                  <p className="text-[12px] text-muted-foreground">{day.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      Insgesamt{' '}
                      <span className="ml-1 font-semibold text-foreground">{fmtHms(day.total)}</span>
                    </p>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      title="Zeit nachtragen"
                      onClick={() => onAddDate(day.date)}
                    >
                      <PlusIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="divide-y divide-border/60 bg-card">
                  {day.entries.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Keine Einträge.</p>
                  ) : (
                    day.entries.map(entry => (
                      <TimeEntryRow
                        key={entry.id}
                        entry={entry}
                        projects={projects}
                        running={activeEntryId === entry.id}
                        onPatched={onPatched}
                        onPlay={onPlay}
                        onStop={onStop}
                        onDelete={onDelete}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
