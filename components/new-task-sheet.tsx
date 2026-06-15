'use client';

import { useEffect, useRef, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          <DrawerHeader className="px-0 pt-2 pb-4">
            <DrawerTitle>Neue Aufgabe</DrawerTitle>
          </DrawerHeader>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-title">Titel</Label>
              <Input ref={titleRef} id="task-title" value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Was muss gemacht werden?" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Priorität</Label>
              <div className="flex gap-2">
                {PRIO.map(p => (
                  <button key={p.value} type="button" onClick={() => setPrio(p.value)} className="flex-1">
                    <Badge
                      variant={prio === p.value ? 'default' : 'outline'}
                      className="w-full justify-center py-1.5 cursor-pointer">
                      {p.label}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-firma">Firma</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="task-firma" className="w-full">
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-projekt">Projekt</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="task-projekt" className="w-full">
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
              <div className="flex flex-col gap-1.5 flex-1">
                <Label htmlFor="task-date">Datum</Label>
                <Input id="task-date" type="date" value={plannedDate}
                  onChange={e => setPlannedDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 w-24">
                <Label htmlFor="task-min">Minuten</Label>
                <Input id="task-min" type="number" value={zeitMin}
                  onChange={e => setZeitMin(e.target.value)} placeholder="z.B. 60" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" className="flex-1"
                disabled={saving || !title.trim() || !projectId}>
                {saving ? 'Speichern…' : 'Anlegen'}
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
