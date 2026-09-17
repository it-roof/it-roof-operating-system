'use client';

import { useCallback, useEffect, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimeTrackerBar } from '@/components/time-tracker-bar';
import { TimeEntryRow } from '@/components/time-entry-row';
import { TimeEntryDialog } from '@/components/time-entry-dialog';
import { useTimer } from '@/lib/timer-context';
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
  const { activeId, startTask, stopTask } = useTimer();
  const [projects, setProjects] = useState<TrackerProject[] | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [addDate, setAddDate] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const r = await fetch('/api/time-entries');
      if (!r.ok) return;
      const data = await r.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      // Liste bleibt beim letzten Stand
    }
  }, []);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((data: TrackerProject[]) => setProjects(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries, activeId]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, []);

  function refresh() {
    onCreated();
    void loadEntries();
  }

  const weeks = groupTimeEntries(entries, now);
  const runningEntry = entries.find(e => !e.stopped_at);
  const projectList = projects ?? [];

  return (
    <>
      <TimeTrackerBar tasks={tasks} projects={projectList} onChanged={refresh} />

      {projects && projects.length === 0 && (
        <p className="mb-6 text-sm text-muted-foreground">
          Kein Projekt vorhanden. Lege zuerst ein Projekt an, dann kannst du die Zeit starten.
        </p>
      )}

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
                        onClick={() => setAddDate(day.date)}
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
                          now={now}
                          projects={projectList}
                          running={runningEntry?.id === entry.id}
                          onChanged={refresh}
                          onPlay={() => {
                            void startTask(entry.task_id, entry.title).then(refresh);
                          }}
                          onStop={() => {
                            void stopTask().then(refresh);
                          }}
                          onDelete={() => {
                            if (entry.legacy) return;
                            void (async () => {
                              const wasRunning = runningEntry?.id === entry.id;
                              await fetch(`/api/time-entries/${entry.id}`, { method: 'DELETE' });
                              if (wasRunning) await stopTask();
                              refresh();
                            })();
                          }}
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
