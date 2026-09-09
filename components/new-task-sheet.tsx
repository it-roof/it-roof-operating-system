'use client';

import { useEffect, useRef, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SaveForm } from '@/components/save-form';
import { cn } from '@/lib/utils';

type Company = { id: string; name: string };
type Project = { id: string; name: string };

type Props = {
  open: boolean;
  defaultDate?: string;
  onClose: () => void;
  onCreated: () => void;
};

const PRIO = [
  { value: 'high', label: 'Hoch' },
  { value: 'medium', label: 'Mittel' },
  { value: 'low', label: 'Niedrig' },
];

export default function NewTaskSheet({ open, defaultDate, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [prio, setPrio] = useState('medium');
  const [companyId, setCompanyId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [plannedDate, setPlannedDate] = useState(defaultDate ?? '');
  const [zeitMin, setZeitMin] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetch('/api/companies').then(r => r.json()).then(setCompanies);
      setTitle(''); setPrio('medium'); setCompanyId(''); setProjectId('');
      setPlannedDate(defaultDate ?? ''); setZeitMin('');
      setTimeout(() => titleRef.current?.focus(), 150);
    }
  }, [open, defaultDate]);

  useEffect(() => {
    if (!companyId) { setProjects([]); setProjectId(''); return; }
    fetch(`/api/projects?company_id=${companyId}`)
      .then(r => r.json())
      .then((data: Project[]) => { setProjects(data); setProjectId(data[0]?.id ?? ''); });
  }, [companyId]);

  async function submit() {
    if (!title.trim() || !projectId) return;
    setSaving(true);
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        priority: prio,
        project_id: projectId,
        planned_date: plannedDate || null,
        time_estimate_minutes: zeitMin ? parseInt(zeitMin) : null,
      }),
    });
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <Drawer open={open} onOpenChange={v => !v && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-xl px-5 pb-8">
          <DrawerHeader className="px-0 pt-4 pb-5">
            <DrawerTitle className="text-lg">Neue Aufgabe</DrawerTitle>
          </DrawerHeader>

          <SaveForm onSave={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-title" className="text-sm font-medium">Titel</Label>
              <Input
                ref={titleRef}
                id="task-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Was muss gemacht werden?"
                className="h-10"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Priorität</Label>
              <div className="flex gap-2">
                {PRIO.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPrio(p.value)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 border',
                      prio === p.value
                        ? p.value === 'high'   ? 'bg-danger text-danger-foreground border-danger'
                        : p.value === 'medium' ? 'bg-warning text-warning-foreground border-warning'
                        :                        'bg-muted text-foreground border-border'
                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-firma" className="text-sm font-medium">Firma</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="task-firma" className="w-full h-10">
                  <SelectValue placeholder="Firma wählen…" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {projects.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-projekt" className="text-sm font-medium">Projekt</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="task-projekt" className="w-full h-10">
                    <SelectValue placeholder="Projekt wählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="task-date" className="text-sm font-medium">Datum</Label>
                <Input id="task-date" type="date" value={plannedDate}
                  onChange={e => setPlannedDate(e.target.value)} className="h-10" />
              </div>
              <div className="flex flex-col gap-2 w-28">
                <Label htmlFor="task-min" className="text-sm font-medium">Minuten</Label>
                <Input id="task-min" type="number" value={zeitMin}
                  onChange={e => setZeitMin(e.target.value)} placeholder="60" className="h-10" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" variant="success-solid" className="flex-1 h-11"
                disabled={saving || !title.trim() || !projectId}>
                {saving ? 'Speichern…' : 'Anlegen'}
              </Button>
            </div>
          </SaveForm>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
