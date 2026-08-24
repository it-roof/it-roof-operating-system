'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { ConfirmDelete } from '@/components/leads/confirm-delete';

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  step_count: number;
};

export function CampaignsTab() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/campaigns');
    const data = await r.json();
    setRows(data.campaigns ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setName('');
    setDescription('');
    setOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description ?? '');
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch(editingId ? `/api/campaigns/${editingId}` : '/api/campaigns', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="icon" className="size-10 rounded-full" onClick={openCreate}><PlusIcon className="size-4" /></Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Keine Kampagnen.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.name}</p>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  {c.step_count} Steps{c.description ? ` · ${c.description}` : ''}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(c)}>
                <PencilIcon className="size-3.5" />
              </Button>
              <ConfirmDelete label={`Kampagne „${c.name}" inkl. Steps löschen?`} onConfirm={() => remove(c.id)} />
            </div>
          ))}
        </div>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-xl px-5 pb-8">
            <DrawerHeader className="px-0 pt-4 pb-5">
              <DrawerTitle>{editingId ? 'Kampagne bearbeiten' : 'Kampagne anlegen'}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Beschreibung</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button variant="success-solid" className="flex-1 h-11" disabled={saving || !name.trim()} onClick={save}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
