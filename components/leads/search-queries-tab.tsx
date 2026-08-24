'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { ConfirmDelete } from '@/components/leads/confirm-delete';
import { ListPagination } from '@/components/leads/list-pagination';
import { PAGE_SIZE, type PageSize } from '@/lib/leads/pagination';
import { cn } from '@/lib/utils';

type Tag = { id: string; name: string; search_count?: number };

type Row = {
  id: string;
  query: string;
  searched: boolean;
  searchedAt: string | null;
  createdAt: string;
  lead_count: number;
  tags: { id: string; name: string }[];
};

export function SearchQueriesTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [untaggedCount, setUntaggedCount] = useState(0);
  const [tagId, setTagId] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(PAGE_SIZE);
  const [paging, setPaging] = useState({ page: 1, pages: 1, total: 0, limit: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
    });
    if (tagId !== 'all') params.set('tag_id', tagId);
    const r = await fetch(`/api/search-queries?${params}`);
    const data = await r.json();
    setRows(data.search_queries ?? []);
    if (data.meta?.tags) setTags(data.meta.tags);
    if (typeof data.meta?.untagged_count === 'number') setUntaggedCount(data.meta.untagged_count);
    if (data.meta) {
      setPaging({
        page: data.meta.page ?? 1,
        pages: data.meta.pages ?? 1,
        total: data.meta.total ?? 0,
        limit: data.meta.limit ?? PAGE_SIZE,
      });
    }
    setLoading(false);
  }

  useEffect(() => { setPage(1); }, [tagId]);
  useEffect(() => { load(); }, [tagId, page, limit]);

  function openCreate() {
    setEditingId(null);
    setQuery('');
    setSearched(false);
    setOpen(true);
  }

  function openEdit(r: Row) {
    setEditingId(r.id);
    setQuery(r.query);
    setSearched(r.searched);
    setOpen(true);
  }

  async function save() {
    if (!query.trim()) return;
    setSaving(true);
    await fetch(editingId ? `/api/search-queries/${editingId}` : '/api/search-queries', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, searched }),
    });
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/search-queries/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div>
      <div className="mb-4 flex items-start gap-2">
        <div className="flex flex-1 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTagId('all')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-mono font-medium tracking-wide transition-all',
              tagId === 'all'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            Alle Tags
          </button>
          <button
            type="button"
            onClick={() => setTagId('none')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-mono font-medium tracking-wide transition-all',
              tagId === 'none'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            Ohne Tags{untaggedCount ? ` · ${untaggedCount}` : ''}
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTagId(t.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-mono font-medium tracking-wide transition-all',
                tagId === t.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {t.name}
              {typeof t.search_count === 'number' ? ` · ${t.search_count}` : ''}
            </button>
          ))}
        </div>
        <Button size="icon" className="size-10 shrink-0 rounded-full" onClick={openCreate}>
          <PlusIcon className="size-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Keine Suchanfragen.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.query}</p>
                <p className={`font-mono text-[11px] ${r.searched ? 'text-success' : 'text-warning'}`}>
                  {r.lead_count} Leads
                  {' · '}
                  {r.searched ? 'gesucht' : 'offen'}
                  {r.searchedAt ? ` · ${new Date(r.searchedAt).toLocaleDateString('de')}` : ''}
                </p>
                {(r.tags?.length ?? 0) > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTagId(t.id)}
                        className={cn(
                          'rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-wide transition-colors',
                          tagId === t.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(r)}>
                <PencilIcon className="size-3.5" />
              </Button>
              <ConfirmDelete label={`„${r.query}" löschen?`} onConfirm={() => remove(r.id)} />
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
              <DrawerTitle>{editingId ? 'Suchanfrage bearbeiten' : 'Suchanfrage anlegen'}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Query</Label>
                <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-10" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Bereits gesucht</Label>
                <Switch checked={searched} onCheckedChange={setSearched} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 flex-1" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button variant="success-solid" className="h-11 flex-1" disabled={saving || !query.trim()} onClick={save}>
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
