'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { ConfirmDelete } from '@/components/leads/confirm-delete';

type Step = {
  id: string;
  campaignId: string;
  stepOrder: number;
  type: string;
  delayDays: number;
};

type Campaign = { id: string; name: string };

const EMPTY = { campaign_id: '', step_order: '1', type: 'email', delay_days: '0' };

export function StepsTab() {
  const [rows, setRows] = useState<Step[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (campaignFilter !== 'all') params.set('campaign_id', campaignFilter);
    const [stepsRes, campsRes] = await Promise.all([
      fetch(`/api/campaign-steps?${params}`),
      fetch('/api/campaigns'),
    ]);
    const stepsData = await stepsRes.json();
    const campsData = await campsRes.json();
    setRows(stepsData.steps ?? []);
    setCampaigns((campsData.campaigns ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [campaignFilter]);

  const campaignName = (id: string) => campaigns.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY,
      campaign_id: campaignFilter !== 'all' ? campaignFilter : (campaigns[0]?.id ?? ''),
    });
    setOpen(true);
  }

  function openEdit(s: Step) {
    setEditingId(s.id);
    setForm({
      campaign_id: s.campaignId,
      step_order: String(s.stepOrder),
      type: s.type,
      delay_days: String(s.delayDays),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.campaign_id) return;
    setSaving(true);
    await fetch(editingId ? `/api/campaign-steps/${editingId}` : '/api/campaign-steps', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: form.campaign_id,
        step_order: Number(form.step_order),
        type: form.type,
        delay_days: Number(form.delay_days),
      }),
    });
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/campaign-steps/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="h-10 flex-1"><SelectValue placeholder="Kampagne" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kampagnen</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="icon" className="size-10 rounded-full" onClick={openCreate}><PlusIcon className="size-4" /></Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Keine Steps.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {rows.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">#{s.stepOrder} · {s.type}</p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {campaignName(s.campaignId)} · Delay {s.delayDays}d
                </p>
              </div>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(s)}>
                <PencilIcon className="size-3.5" />
              </Button>
              <ConfirmDelete label={`Step #${s.stepOrder} (${s.type}) löschen?`} onConfirm={() => remove(s.id)} />
            </div>
          ))}
        </div>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-xl px-5 pb-8">
            <DrawerHeader className="px-0 pt-4 pb-5">
              <DrawerTitle>{editingId ? 'Step bearbeiten' : 'Step anlegen'}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Kampagne</Label>
                <Select value={form.campaign_id} onValueChange={(v) => setForm({ ...form, campaign_id: v })}>
                  <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Wählen…" /></SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Order</Label>
                  <Input type="number" value={form.step_order} onChange={(e) => setForm({ ...form, step_order: e.target.value })} className="h-10" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Typ</Label>
                  <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-10" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Delay (Tage)</Label>
                  <Input type="number" value={form.delay_days} onChange={(e) => setForm({ ...form, delay_days: e.target.value })} className="h-10" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button variant="success-solid" className="flex-1 h-11" disabled={saving || !form.campaign_id} onClick={save}>
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
