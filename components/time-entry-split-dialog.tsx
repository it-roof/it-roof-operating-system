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
import { type TimeEntry, fmtHms, parseHms } from '@/lib/time-entry-utils';

type Props = {
  open: boolean;
  entry: TimeEntry | null;
  onClose: () => void;
  onDone: () => void;
};

export function TimeEntrySplitDialog({ open, entry, onClose, onDone }: Props) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('01:00:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxSecs = entry?.duration_seconds ?? 0;

  useEffect(() => {
    if (!open || !entry) return;
    setTitle('');
    const half = Math.max(60, Math.floor(entry.duration_seconds / 2));
    // Vorschlag: max. 1h, aber Original behält mind. 1 Minute
    const suggest = Math.min(half, 3600, Math.max(60, entry.duration_seconds - 60));
    setDuration(fmtHms(suggest));
    setError(null);
  }, [open, entry]);

  async function submit() {
    if (!entry) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Name erforderlich');
      return;
    }
    const secs = parseHms(duration);
    if (secs == null || secs < 60) {
      setError('Ungültige Dauer (mind. 1 Minute)');
      return;
    }
    if (secs >= maxSecs) {
      setError(`Dauer muss kleiner als ${fmtHms(maxSecs)} sein`);
      return;
    }
    if (maxSecs - secs < 60) {
      setError('Mindestens 1 Minute muss am Original bleiben');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/time-entries/${entry.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed, duration_seconds: secs }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Split fehlgeschlagen');
        return;
      }
      // Zuerst schließen, dann reload — sonst Unmount mit offenem Dialog
      onClose();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eintrag splitten</DialogTitle>
        </DialogHeader>
        <SaveForm onSave={submit} className="flex flex-col gap-4">
          {entry && (
            <p className="font-mono text-[11px] text-muted-foreground">
              Von „{entry.title}“ ({fmtHms(maxSecs)}) abziehen und neuen Block danach anlegen.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Neuer Name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Meeting"
              className="h-10"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Dauer</Label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="01:00:00"
              className="h-10 font-mono"
            />
            <p className="font-mono text-[11px] text-muted-foreground">
              Format HH:MM:SS · max. unter {fmtHms(maxSecs)}
            </p>
          </div>
          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="h-10" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" className="h-10" disabled={saving || !entry}>
              {saving ? 'Splitten…' : 'Splitten'}
            </Button>
          </DialogFooter>
        </SaveForm>
      </DialogContent>
    </Dialog>
  );
}
