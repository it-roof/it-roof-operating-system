'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SaveForm } from '@/components/save-form';
import { ProjectPicker } from '@/components/project-picker';
import { useTimer } from '@/lib/timer-context';
import { type Task, type TrackerProject } from '@/lib/types';
import { ensureTask } from '@/lib/ensure-task';
import {
  applyEndClock,
  combineLocal,
  fmtHms,
  parseClock,
  parseHms,
  secondsBetween,
} from '@/lib/time-entry-utils';

type Props = {
  open: boolean;
  date: string;
  tasks: Task[];
  projects: TrackerProject[];
  onClose: () => void;
  onSaved: () => void;
};

export function TimeEntryDialog({ open, date, tasks, projects, onClose, onSaved }: Props) {
  const { userId } = useTimer();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startClock, setStartClock] = useState('09:00');
  const [endClock, setEndClock] = useState('10:00');
  const [duration, setDuration] = useState('01:00:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setStartClock('09:00');
    setEndClock('10:00');
    setDuration('01:00:00');
    setError(null);
    const key = userId ? `cherry-os-last-project:${userId}` : null;
    const last = key ? localStorage.getItem(key) : null;
    setProjectId(last && projects.some(p => p.id === last) ? last : (projects[0]?.id ?? ''));
  }, [open, projects, userId]);

  function syncDurationFromClocks(start: string, end: string) {
    const sc = parseClock(start);
    const ec = parseClock(end);
    if (!sc || !ec) return;
    const started = combineLocal(date, sc);
    const stopped = applyEndClock(started, ec);
    setDuration(fmtHms(secondsBetween(started, stopped)));
  }

  function syncEndFromDuration(start: string, dur: string) {
    const sc = parseClock(start);
    const secs = parseHms(dur);
    if (!sc || secs == null) return;
    const started = combineLocal(date, sc);
    const stopped = new Date(new Date(started).getTime() + secs * 1000);
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    setEndClock(`${pad(stopped.getHours())}:${pad(stopped.getMinutes())}`);
  }

  async function submit() {
    const sc = parseClock(startClock);
    const ec = parseClock(endClock);
    if (!title.trim() || !projectId || !sc || !ec) {
      setError('Titel, Projekt und gültige Zeiten sind nötig.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const taskId = await ensureTask(title, projectId, tasks);
      if (!taskId) {
        setError('Aufgabe konnte nicht angelegt werden.');
        return;
      }
      const started_at = combineLocal(date, sc);
      const stopped_at = applyEndClock(started_at, ec);
      const r = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, title: title.trim(), started_at, stopped_at }),
      });
      if (!r.ok) {
        setError('Eintrag konnte nicht gespeichert werden.');
        return;
      }
      if (userId) localStorage.setItem(`cherry-os-last-project:${userId}`, projectId);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zeit nachtragen</DialogTitle>
        </DialogHeader>
        <SaveForm onSave={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="manual-title">Aufgabe</Label>
            <Input
              id="manual-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Was wurde gemacht?"
              className="h-10"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Projekt</Label>
            <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} className="h-10 border border-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-start">Von</Label>
              <Input
                id="manual-start"
                type="time"
                value={startClock}
                onChange={e => {
                  setStartClock(e.target.value);
                  syncDurationFromClocks(e.target.value, endClock);
                }}
                className="h-10 font-mono"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-end">Bis</Label>
              <Input
                id="manual-end"
                type="time"
                value={endClock}
                onChange={e => {
                  setEndClock(e.target.value);
                  syncDurationFromClocks(startClock, e.target.value);
                }}
                className="h-10 font-mono"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="manual-dur">Dauer</Label>
            <Input
              id="manual-dur"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              onBlur={() => syncEndFromDuration(startClock, duration)}
              className="h-10 font-mono"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <DialogFooter className="px-0">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving || !title.trim() || !projectId}>
              {saving ? 'Speichern…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </SaveForm>
      </DialogContent>
    </Dialog>
  );
}
