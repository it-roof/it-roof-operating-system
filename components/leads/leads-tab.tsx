'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { ChevronsUpDownIcon, PencilIcon, PlusIcon, UserIcon, UsersIcon } from 'lucide-react';
import { ConfirmDelete } from '@/components/leads/confirm-delete';
import { ListPagination } from '@/components/leads/list-pagination';
import { SaveForm } from '@/components/save-form';
import { PAGE_SIZE, type PageSize } from '@/lib/leads/pagination';
import { cn } from '@/lib/utils';

type LeadContact = {
  id: string;
  salutation: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
};

type Lead = {
  id: string;
  company_name: string;
  domain: string | null;
  street: string | null;
  city: string | null;
  country_code: string | null;
  phone: string | null;
  industry: string | null;
  status: string;
  contacts: LeadContact[];
};

type SearchOption = { id: string; query: string; lead_count: number };

const STATUS_DE: Record<string, string> = {
  complete: 'Vollständig',
  raw: 'Roh',
  error_incomplete: 'Unvollständig',
  error_no_domain: 'Ohne Domain',
};

const STATUS_CLASS: Record<string, string> = {
  complete: 'text-success',
  raw: 'text-info',
  error_incomplete: 'text-warning',
  error_no_domain: 'text-danger',
};

const EMPTY_FORM = {
  company_name: '',
  domain: '',
  street: '',
  city: '',
  country_code: 'DE',
  phone: '',
  industry: '',
  status: 'raw',
};

export function LeadsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<{
    returned: number;
    total: number;
    complete: number;
    all_total?: number;
    page: number;
    pages: number;
    limit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('all');
  const [city, setCity] = useState('all');
  const [cities, setCities] = useState<{ city: string; n: number }[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [searchQueryId, setSearchQueryId] = useState(
    () => searchParams.get('search_query_id') ?? 'all',
  );
  const [searches, setSearches] = useState<SearchOption[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(PAGE_SIZE);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const fromUrl = searchParams.get('search_query_id') ?? 'all';
    setSearchQueryId((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  function setSearchQueryFilter(id: string) {
    setSearchQueryId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'all') params.delete('search_query_id');
    else params.set('search_query_id', id);
    const qs = params.toString();
    router.replace(qs ? `/leads?${qs}` : '/leads', { scroll: false });
  }

  async function load(signal?: AbortSignal) {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
    });
    if (debounced) params.set('q', debounced);
    if (status !== 'all') params.set('status', status);
    if (city !== 'all') params.set('city', city);
    if (searchQueryId !== 'all') params.set('search_query_id', searchQueryId);
    const r = await fetch(`/api/leads?${params}`, { signal });
    const data = await r.json();
    setLeads(data.leads ?? []);
    setMeta(data.meta ?? null);
    if (data.meta?.cities) setCities(data.meta.cities);
    if (data.meta?.searches) setSearches(data.meta.searches);
    setLoading(false);
  }

  useEffect(() => {
    setPage(1);
  }, [debounced, status, city, searchQueryId]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal).catch((e) => {
      if (e.name !== 'AbortError') setLoading(false);
    });
    return () => ctrl.abort();
  }, [debounced, status, city, searchQueryId, page, limit]);

  const activeSearchLabel =
    searchQueryId === 'all'
      ? 'Alle Suchen'
      : (searches.find((s) => s.id === searchQueryId)?.query ?? 'Suche');

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(l: Lead) {
    setEditingId(l.id);
    setForm({
      company_name: l.company_name,
      domain: l.domain ?? '',
      street: l.street ?? '',
      city: l.city ?? '',
      country_code: l.country_code ?? 'DE',
      phone: l.phone ?? '',
      industry: l.industry ?? '',
      status: l.status,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.company_name.trim()) return;
    setSaving(true);
    await fetch(editingId ? `/api/leads/${editingId}` : '/api/leads', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Firma, Branche, Kontakt…"
          className="h-10 min-w-[160px] flex-1"
        />

        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className="h-10 w-[240px] shrink-0 justify-between font-normal"
            >
              <span className="truncate">{activeSearchLabel}</span>
              <ChevronsUpDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command className="h-auto max-h-80">
              <CommandInput placeholder="Suche filtern…" />
              <CommandList className="max-h-64">
                <CommandEmpty className="flex py-4">Keine Suche gefunden.</CommandEmpty>
                <CommandGroup heading="Suchen">
                  <CommandItem
                    value="Alle Suchen"
                    data-checked={searchQueryId === 'all' || undefined}
                    onSelect={() => {
                      setSearchQueryFilter('all');
                      setSearchOpen(false);
                    }}
                  >
                    Alle Suchen
                  </CommandItem>
                  {searches.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={s.query}
                      keywords={[s.query]}
                      data-checked={searchQueryId === s.id || undefined}
                      onSelect={() => {
                        setSearchQueryFilter(s.id);
                        setSearchOpen(false);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{s.query}</span>
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {s.lead_count}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className="h-10 w-[220px] shrink-0 justify-between font-normal"
            >
              <span className="truncate">
                {city === 'all' ? 'Alle Städte' : city}
              </span>
              <ChevronsUpDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command className="h-auto max-h-80">
              <CommandInput placeholder="Stadt suchen…" />
              <CommandList className="max-h-64">
                <CommandEmpty className="flex py-4">Keine Stadt gefunden.</CommandEmpty>
                <CommandGroup heading="Städte">
                  <CommandItem
                    value="Alle Städte"
                    data-checked={city === 'all' || undefined}
                    onSelect={() => {
                      setCity('all');
                      setCityOpen(false);
                    }}
                  >
                    Alle Städte
                  </CommandItem>
                  {cities.map((c) => (
                    <CommandItem
                      key={c.city}
                      value={c.city}
                      keywords={[c.city]}
                      data-checked={city === c.city || undefined}
                      onSelect={() => {
                        setCity(c.city);
                        setCityOpen(false);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{c.city}</span>
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{c.n}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button size="icon" className="size-10 shrink-0 rounded-full" onClick={openCreate}>
          <PlusIcon className="size-4" />
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['all', 'complete', 'raw', 'error_incomplete', 'error_no_domain'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-mono font-medium tracking-wide transition-all',
              status === s
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {s === 'all' ? 'Alle' : STATUS_DE[s]}
          </button>
        ))}
      </div>

      {meta && (
        <p className="mb-3 font-mono text-[11px] tracking-wide text-muted-foreground">
          {meta.total} Treffer
          {typeof meta.all_total === 'number' ? ` · ${meta.all_total} gesamt` : ''}
          {' · '}
          {meta.complete} vollständig
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </div>
      ) : leads.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Keine Leads gefunden.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-[11px] tracking-wide">Firma</TableHead>
              <TableHead className="font-mono text-[11px] tracking-wide">Stadt</TableHead>
              <TableHead className="hidden font-mono text-[11px] tracking-wide md:table-cell">Branche</TableHead>
              <TableHead className="hidden font-mono text-[11px] tracking-wide lg:table-cell">Domain</TableHead>
              <TableHead className="font-mono text-[11px] tracking-wide">Status</TableHead>
              <TableHead className="font-mono text-[11px] tracking-wide text-right">Kontakte</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => openEdit(l)}>
                <TableCell className="max-w-[220px]">
                  <span className="block truncate font-medium">{l.company_name}</span>
                  {l.street && (
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                      {l.street}
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-[12px] text-muted-foreground">
                  {[l.city, l.country_code].filter(Boolean).join(', ') || '—'}
                </TableCell>
                <TableCell className="hidden max-w-[160px] truncate font-mono text-[12px] text-muted-foreground md:table-cell">
                  {l.industry || '—'}
                </TableCell>
                <TableCell className="hidden max-w-[160px] lg:table-cell" onClick={(e) => e.stopPropagation()}>
                  {l.domain ? (
                    <a
                      href={l.domain.startsWith('http') ? l.domain : `https://${l.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-mono text-[12px] text-info hover:underline"
                    >
                      {l.domain}
                    </a>
                  ) : (
                    <span className="font-mono text-[12px] text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={cn('font-mono text-[11px]', STATUS_CLASS[l.status] ?? '')}>
                    {STATUS_DE[l.status] ?? l.status}
                  </span>
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  {l.contacts.length > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-info"
                          aria-label={`${l.contacts.length} Kontakt${l.contacts.length !== 1 ? 'e' : ''}`}
                        >
                          {l.contacts.length > 1 ? (
                            <UsersIcon className="size-4" />
                          ) : (
                            <UserIcon className="size-4" />
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-80 p-0">
                        <div className="border-b border-border/60 px-4 py-3">
                          <p className="text-sm font-medium">{l.company_name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {l.contacts.length} Kontakt{l.contacts.length !== 1 ? 'e' : ''}
                          </p>
                        </div>
                        <ul className="max-h-64 divide-y divide-border/60 overflow-y-auto">
                          {l.contacts.map((c) => (
                            <li key={c.id} className="px-4 py-3">
                              <ContactPopoverItem contact={c} />
                            </li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="inline-flex size-8 items-center justify-center text-muted-foreground/30">
                      <UserIcon className="size-4" />
                    </span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-0.5">
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(l)}>
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <ConfirmDelete
                      label={`„${l.company_name}" und zugehörige Kontakte löschen?`}
                      onConfirm={() => remove(l.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {meta && (
        <ListPagination
          page={meta.page}
          pages={meta.pages}
          total={meta.total}
          limit={meta.limit}
          onPageChange={setPage}
          onLimitChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
        />
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-xl px-5 pb-8">
            <DrawerHeader className="px-0 pt-4 pb-5">
              <DrawerTitle>{editingId ? 'Lead bearbeiten' : 'Lead anlegen'}</DrawerTitle>
            </DrawerHeader>
            <SaveForm onSave={save} className="flex flex-col gap-4">
              <Field label="Firma">
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="h-10" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stadt">
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-10" />
                </Field>
                <Field label="Branche">
                  <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="h-10" />
                </Field>
              </div>
              <Field label="Domain">
                <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="h-10" />
              </Field>
              <Field label="Straße">
                <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="h-10" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefon">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10" />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_DE).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button type="submit" variant="success-solid" className="h-11 flex-1" disabled={saving || !form.company_name.trim()}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            </SaveForm>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function contactName(c: LeadContact) {
  return [c.salutation, c.first_name, c.last_name].filter(Boolean).join(' ') || 'Kontakt';
}

function ContactPopoverItem({ contact: c }: { contact: LeadContact }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">{contactName(c)}</p>
      {c.position && (
        <p className="font-mono text-[11px] text-muted-foreground">{c.position}</p>
      )}
      {c.email && (
        <a
          href={`mailto:${c.email}`}
          className="font-mono text-[11px] text-info hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {c.email}
        </a>
      )}
      {c.phone && (
        <a
          href={`tel:${c.phone}`}
          className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {c.phone}
        </a>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
