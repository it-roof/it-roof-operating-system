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
import { ListPagination } from '@/components/leads/list-pagination';
import { PAGE_SIZE, type PageSize } from '@/lib/leads/pagination';

type Row = {
  id: string;
  campaign_id: string;
  lead_id: string;
  current_step_id: string | null;
  status: string;
  campaign_name: string | null;
  company_name: string | null;
};

type Campaign = { id: string; name: string };

const EMPTY = { campaign_id: '', lead_id: '', current_step_id: '', status: 'pending' };

export function CampaignLeadsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(PAGE_SIZE);
  const [paging, setPaging] = useState({ page: 1, pages: 1, total: 0, limit: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
    });
    if (campaignFilter !== 'all') params.set('campaign_id', campaignFilter);
    const [clRes, campsRes] = await Promise.all([
      fetch(`/api/campaign-leads?${params}`),
      fetch('/api/campaigns'),
    ]);
    const clData = await clRes.json();
    const campsData = await campsRes.json();
    setRows(clData.campaign_leads ?? []);
    if (clData.meta) {
      setPaging({
        page: clData.meta.page ?? 1,
        pages: clData.meta.pages ?? 1,
        total: clData.meta.total ?? 0,
        limit: clData.meta.limit ?? PAGE_SIZE,
      });
    }
    setCampaigns((campsData.campaigns ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    setLoading(false);
  }

  useEffect(() => { setPage(1); }, [campaignFilter]);
  useEffect(() => { load(); }, [campaignFilter, page, limit]);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY,
      campaign_id: campaignFilter !== 'all' ? campaignFilter : (campaigns[0]?.id ?? ''),
    });
    setOpen(true);
  }

  function openEdit(r: Row) {
    setEditingId(r.id);
    setForm({
      campaign_id: r.campaign_id,
      lead_id: r.lead_id,
      current_step_id: r.current_step_id ?? '',
      status: r.status,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.campaign_id || !form.lead_id) return;
    setSaving(true);
    await fetch(editingId ? `/api/campaign-leads/${editingId}` : '/api/campaign-leads', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: form.campaign_id,
        lead_id: form.lead_id,
        current_step_id: form.current_step_id || null,
        status: form.status,
      }),
    });
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/campaign-leads/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="h-10 flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kampagnen</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="icon" className="size-10 rounded-full" onClick={openCreate}><PlusIcon className="size-4" /></Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Keine Zuordnungen.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.company_name ?? r.lead_id.slice(0, 8)}</p>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {r.campaign_name ?? r.campaign_id.slice(0, 8)} · {r.status}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(r)}>
                <PencilIcon className="size-3.5" />
              </Button>
              <ConfirmDelete label="Zuordnung löschen?" onConfirm={() => remove(r.id)} />
            </div>
          ))}
        </div>
      )}

      <ListPagination
        page={paging.page}
        pages={paging.pages}
        total={paging.total}
        limit={paging.limit}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-xl px-5 pb-8">
            <DrawerHeader className="px-0 pt-4 pb-5">
              <DrawerTitle>{editingId ? 'Zuordnung bearbeiten' : 'Lead zu Kampagne'}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Kampagne</Label>
                <Select value={form.campaign_id} onValueChange={(v) => setForm({ ...form, campaign_id: v })}>
                  <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Lead-ID</Label>
                <Input value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })} className="h-10 font-mono text-xs" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Current Step ID (optional)</Label>
                <Input value={form.current_step_id} onChange={(e) => setForm({ ...form, current_step_id: e.target.value })} className="h-10 font-mono text-xs" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button variant="success-solid" className="flex-1 h-11" disabled={saving || !form.campaign_id || !form.lead_id} onClick={save}>
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
