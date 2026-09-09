'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  FileTextIcon,
  MailIcon,
  MessageCircleIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  ScrollTextIcon,
  SearchIcon,
  SkipForwardIcon,
  TimerIcon,
  type LucideIcon,
} from 'lucide-react';
import { ConfirmDelete } from '@/components/leads/confirm-delete';
import { SaveForm } from '@/components/save-form';
import {
  CAMPAIGN_STEP_TYPES,
  campaignStepMeta,
  delayLabel,
  normalizeCampaignStepType,
  stepTemplateStatus,
  stepUsesSubject,
  stepUsesTemplate,
  type CampaignStepType,
} from '@/lib/leads/campaign-steps';
import { TemplateEditorFields } from '@/components/leads/template-field';
import { cn } from '@/lib/utils';
import {
  splitHeaderY,
  splitLeftPad,
  splitLeftPadEnd,
  splitRightPad,
} from '@/lib/page-layout';

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  step_count: number;
};

type Step = {
  id: string;
  campaignId: string;
  stepOrder: number;
  type: string;
  delayDays: number;
  subjectTemplate: string | null;
  bodyTemplate: string | null;
};

type WorkItem = {
  id: string;
  lead_id: string;
  status: string;
  company_name: string;
  city: string | null;
  domain: string | null;
  contact: {
    id: string;
    salutation: string | null;
    first_name: string | null;
    last_name: string | null;
    position: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  current_step: {
    id: string;
    type: string;
    label: string;
    step_order: number;
    delay_days: number;
    uses_template: boolean;
  } | null;
  rendered: {
    subject: string;
    body: string;
  };
};

type DetailTab = 'flow' | 'work';

function contactLabel(c: WorkItem['contact']) {
  if (!c) return null;
  const name = [c.salutation, c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return name || null;
}

async function copyText(text: string) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const STEP_ICONS: Record<string, LucideIcon> = {
  email: MailIcon,
  email_reminder: MailIcon,
  letter: ScrollTextIcon,
  call: PhoneIcon,
  linkedin: MessageCircleIcon,
  wait: TimerIcon,
};

function stepIcon(type: string) {
  return STEP_ICONS[type] ?? TimerIcon;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function CampaignsTab() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [reordering, setReordering] = useState(false);

  const [campaignOpen, setCampaignOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [savingCampaign, setSavingCampaign] = useState(false);

  const [stepOpen, setStepOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepType, setStepType] = useState<CampaignStepType>('email');
  const [stepDelay, setStepDelay] = useState('0');
  const [stepSubject, setStepSubject] = useState('');
  const [stepBody, setStepBody] = useState('');
  const [savingStep, setSavingStep] = useState(false);

  const [detailTab, setDetailTab] = useState<DetailTab>('flow');
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workLoading, setWorkLoading] = useState(false);
  const [workId, setWorkId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function load(opts?: { preferId?: string | null; silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    const [campsRes, stepsRes] = await Promise.all([
      fetch('/api/campaigns'),
      fetch('/api/campaign-steps'),
    ]);
    const campsData = await campsRes.json();
    const stepsData = await stepsRes.json();
    const nextRows: Campaign[] = campsData.campaigns ?? [];
    setRows(nextRows);
    setSteps(stepsData.steps ?? []);
    setLoading(false);

    setSelectedId((prev) => {
      if (opts?.preferId && nextRows.some((c) => c.id === opts.preferId)) return opts.preferId;
      if (prev && nextRows.some((c) => c.id === prev)) return prev;
      return nextRows[0]?.id ?? null;
    });
  }

  useEffect(() => {
    load();
  }, []);

  const loadWork = useCallback(async (campaignId: string) => {
    setWorkLoading(true);
    const res = await fetch(`/api/campaigns/${campaignId}/work`);
    const data = await res.json();
    const items: WorkItem[] = data.items ?? [];
    setWorkItems(items);
    setWorkId((prev) => {
      if (prev && items.some((i) => i.id === prev)) return prev;
      return items[0]?.id ?? null;
    });
    setWorkLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedId || detailTab !== 'work') return;
    loadWork(selectedId);
  }, [selectedId, detailTab, loadWork]);

  const stepsByCampaign = useMemo(() => {
    const map = new Map<string, Step[]>();
    for (const s of steps) {
      const list = map.get(s.campaignId) ?? [];
      list.push(s);
      map.set(s.campaignId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.stepOrder - b.stepOrder);
    }
    return map;
  }, [steps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q)
        || (c.description ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  const selected = rows.find((c) => c.id === selectedId) ?? null;
  const selectedSteps = selected ? (stepsByCampaign.get(selected.id) ?? []) : [];
  const activeWork = workItems.find((i) => i.id === workId) ?? workItems[0] ?? null;

  async function handleCopy(key: string, text: string) {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1500);
  }

  async function completeWork(action: 'done' | 'skipped') {
    if (!activeWork || !selected || completing) return;
    setCompleting(true);
    setCopiedKey(null);
    await fetch(`/api/campaign-leads/${activeWork.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setCompleting(false);
    await loadWork(selected.id);
  }

  function openCreateCampaign() {
    setEditingCampaignId(null);
    setName('');
    setDescription('');
    setCampaignOpen(true);
  }

  function openEditCampaign(c: Campaign) {
    setEditingCampaignId(c.id);
    setName(c.name);
    setDescription(c.description ?? '');
    setCampaignOpen(true);
  }

  async function saveCampaign() {
    if (!name.trim() || savingCampaign) return;
    setSavingCampaign(true);
    const isNew = !editingCampaignId;
    const res = await fetch(
      editingCampaignId ? `/api/campaigns/${editingCampaignId}` : '/api/campaigns',
      {
        method: editingCampaignId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      },
    );
    const data = await res.json();
    setSavingCampaign(false);
    setCampaignOpen(false);
    await load({ preferId: isNew ? data.campaign?.id : editingCampaignId, silent: true });
  }

  async function removeCampaign(id: string) {
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    await load({ silent: true });
  }

  function openCreateStep() {
    if (!selected) return;
    setEditingStepId(null);
    setStepType('email');
    setStepDelay('');
    setStepSubject('');
    setStepBody('');
    setStepOpen(true);
  }

  function openEditStep(s: Step) {
    setEditingStepId(s.id);
    setStepType(normalizeCampaignStepType(s.type));
    setStepDelay(s.delayDays > 0 ? String(s.delayDays) : '');
    setStepSubject(s.subjectTemplate ?? '');
    setStepBody(s.bodyTemplate ?? '');
    setStepOpen(true);
  }

  async function saveStep() {
    if (!selected || savingStep) return;
    setSavingStep(true);
    const existing = stepsByCampaign.get(selected.id) ?? [];
    const stepOrder = editingStepId
      ? (existing.find((s) => s.id === editingStepId)?.stepOrder ?? existing.length + 1)
      : existing.length + 1;

    const withTemplate = stepUsesTemplate(stepType);
    const withSubject = withTemplate && stepUsesSubject(stepType);
    await fetch(
      editingStepId ? `/api/campaign-steps/${editingStepId}` : '/api/campaign-steps',
      {
        method: editingStepId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selected.id,
          step_order: stepOrder,
          type: stepType,
          delay_days: Number(stepDelay) || 0,
          subject_template: withSubject ? stepSubject : null,
          body_template: withTemplate ? stepBody : null,
        }),
      },
    );
    setSavingStep(false);
    setStepOpen(false);
    await load({ preferId: selected.id, silent: true });
  }

  async function renumber(campaignId: string, ordered: Step[]) {
    await Promise.all(
      ordered.map((s, i) =>
        fetch(`/api/campaign-steps/${s.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step_order: i + 1 }),
        }),
      ),
    );
  }

  async function removeStep(id: string) {
    if (!selected) return;
    await fetch(`/api/campaign-steps/${id}`, { method: 'DELETE' });
    const remaining = selectedSteps.filter((s) => s.id !== id);
    if (remaining.length) await renumber(selected.id, remaining);
    await load({ preferId: selected.id, silent: true });
  }

  async function moveStep(index: number, direction: -1 | 1) {
    if (!selected || reordering) return;
    const list = [...selectedSteps];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;

    const [item] = list.splice(index, 1);
    list.splice(target, 0, item!);

    setReordering(true);
    setSteps((prev) => [
      ...prev.filter((s) => s.campaignId !== selected.id),
      ...list.map((s, i) => ({ ...s, stepOrder: i + 1 })),
    ]);
    await renumber(selected.id, list);
    setReordering(false);
    await load({ preferId: selected.id, silent: true });
  }

  const showMobileDetail = !!selected;

  // Einheitliche Spalten-Gutters (PageContainer ist bei full+fill randlos)
  const leftPad = splitLeftPad;
  const leftPadEnd = splitLeftPadEnd;
  const rightPad = splitRightPad;
  const headerY = splitHeaderY;

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* —— Liste —— */}
      <section
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          leftPad,
          leftPadEnd,
          showMobileDetail ? 'hidden lg:flex' : 'flex',
        )}
      >
        <header className={cn('flex shrink-0 items-start justify-between gap-3', headerY)}>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Kampagnen</h1>
            <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
              {rows.length === 0
                ? 'Noch keine Kampagnen'
                : `${rows.length} Kampagne${rows.length !== 1 ? 'n' : ''}`}
            </p>
          </div>
          <Button className="h-10 shrink-0 gap-2" onClick={openCreateCampaign}>
            <PlusIcon className="size-4" />
            Neu
          </Button>
        </header>

        {rows.length > 0 && (
          <div className="relative mb-3 shrink-0">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen…"
              className="h-10 pl-9"
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full flex-col justify-center gap-3 py-10">
              <p className="max-w-sm text-sm text-muted-foreground">
                Lege eine Kampagne an und baue danach den Ablauf aus E-Mail, LinkedIn, Anruf oder Wartezeit.
              </p>
              <Button className="h-10 w-fit gap-2" onClick={openCreateCampaign}>
                <PlusIcon className="size-4" />
                Erste Kampagne
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">Keine Treffer.</p>
          ) : (
            <Table className="[&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[11px] tracking-wide">Name</TableHead>
                  <TableHead className="hidden font-mono text-[11px] tracking-wide sm:table-cell">
                    Ablauf
                  </TableHead>
                  <TableHead className="font-mono text-[11px] tracking-wide text-right">
                    Schritte
                  </TableHead>
                  <TableHead className="hidden font-mono text-[11px] tracking-wide lg:table-cell">
                    Angelegt
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const list = stepsByCampaign.get(c.id) ?? [];
                  const active = selectedId === c.id;
                  return (
                    <TableRow
                      key={c.id}
                      data-state={active ? 'selected' : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(c.id)}
                    >
                      <TableCell className="max-w-[220px]">
                        <span className="block truncate font-medium">{c.name}</span>
                        {c.description && (
                          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                            {c.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {list.length === 0 ? (
                          <span className="text-[12px] text-muted-foreground/70">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {list.slice(0, 4).map((s, i) => {
                              const Icon = stepIcon(s.type);
                              const { label } = campaignStepMeta(s.type);
                              return (
                                <span key={s.id} className="inline-flex items-center gap-1.5">
                                  {i > 0 && <span className="text-border">·</span>}
                                  <Icon className="size-3.5" aria-label={label} />
                                </span>
                              );
                            })}
                            {list.length > 4 && (
                              <span className="font-mono text-[11px]">+{list.length - 4}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                        {list.length}
                      </TableCell>
                      <TableCell className="hidden font-mono text-[12px] text-muted-foreground lg:table-cell">
                        {formatDate(c.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {/* —— Detail —— */}
      <aside
        className={cn(
          'min-h-0 w-full shrink-0 flex-col border-border/60 lg:flex lg:border-l',
          detailTab === 'work' ? 'lg:w-[28rem] xl:w-[32rem]' : 'lg:w-[24rem] xl:w-[26rem]',
          rightPad,
          showMobileDetail ? 'flex flex-1' : 'hidden',
        )}
      >
        {selected ? (
          <>
            <header className={cn('flex shrink-0 items-start gap-2 border-b border-border/60', headerY)}>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 shrink-0 lg:hidden"
                onClick={() => setSelectedId(null)}
                aria-label="Zurück"
              >
                <ArrowLeftIcon className="size-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold tracking-tight md:text-xl">
                  {selected.name}
                </h2>
                <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
                  {selectedSteps.length === 0
                    ? 'Ablauf noch leer'
                    : `${selectedSteps.length} Schritt${selectedSteps.length !== 1 ? 'e' : ''}`}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 shrink-0"
                onClick={() => openEditCampaign(selected)}
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <ConfirmDelete
                label={`„${selected.name}" inkl. Ablauf löschen?`}
                onConfirm={() => removeCampaign(selected.id)}
              />
            </header>

            {selected.description && (
              <p className="shrink-0 border-b border-border/60 py-3 text-sm text-muted-foreground">
                {selected.description}
              </p>
            )}

            <div className="flex shrink-0 gap-1 border-b border-border/60 py-2">
              <button
                type="button"
                onClick={() => setDetailTab('flow')}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  detailTab === 'flow'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Ablauf
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('work')}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  detailTab === 'work'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Abarbeiten
                {detailTab === 'work' && workItems.length > 0 && (
                  <span className="ml-1.5 font-mono tabular-nums text-muted-foreground">
                    {workItems.length}
                  </span>
                )}
              </button>
            </div>

            {detailTab === 'flow' ? (
              <>
                <div className="flex shrink-0 items-center justify-between py-3">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground">Schritte</p>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={openCreateStep}>
                    <PlusIcon className="size-3.5" />
                    Schritt
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pb-4">
                  {selectedSteps.length === 0 ? (
                    <div className="flex h-full min-h-48 flex-col justify-center gap-3">
                      <p className="text-sm text-muted-foreground">
                        Noch keine Schritte. Der Ablauf startet mit dem ersten Kontakt.
                      </p>
                      <Button className="h-9 w-fit gap-1.5" onClick={openCreateStep}>
                        <PlusIcon className="size-3.5" />
                        Ersten Schritt
                      </Button>
                    </div>
                  ) : (
                    <ol className="space-y-0">
                      {selectedSteps.map((s, index) => {
                        const Icon = stepIcon(s.type);
                        const { label } = campaignStepMeta(s.type);
                        const isLast = index === selectedSteps.length - 1;
                        const templateStatus = stepTemplateStatus(
                          s.type,
                          s.subjectTemplate,
                          s.bodyTemplate,
                        );
                        return (
                          <li key={s.id} className="relative flex gap-3">
                            <div className="flex w-6 shrink-0 flex-col items-center">
                              <span className="flex size-6 items-center justify-center font-mono text-[11px] tabular-nums text-muted-foreground">
                                {index + 1}
                              </span>
                              {!isLast && <span className="mt-1 w-px flex-1 bg-border/70" />}
                            </div>
                            <div className={cn('min-w-0 flex-1 pb-5', isLast && 'pb-0')}>
                              <div className="flex items-start gap-2">
                                <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium leading-none">{label}</p>
                                  <p className="mt-1 text-[12px] text-muted-foreground">
                                    {delayLabel(s.delayDays)}
                                    {stepUsesTemplate(s.type) && (
                                      <>
                                        {' · '}
                                        {templateStatus === 'complete' ? (
                                          <span className="inline-flex items-center gap-1">
                                            <FileTextIcon className="inline size-3" />
                                            {stepUsesSubject(s.type)
                                              ? 'Betreff + Text'
                                              : 'Text'}
                                          </span>
                                        ) : templateStatus === 'partial' ? (
                                          <span className="text-warning">
                                            Vorlage unvollständig
                                          </span>
                                        ) : (
                                          <span className="text-warning">keine Vorlage</span>
                                        )}
                                      </>
                                    )}
                                  </p>
                                </div>
                                <div className="flex shrink-0">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-7"
                                    disabled={index === 0 || reordering}
                                    onClick={() => moveStep(index, -1)}
                                    aria-label="Nach oben"
                                  >
                                    <ChevronUpIcon className="size-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-7"
                                    disabled={isLast || reordering}
                                    onClick={() => moveStep(index, 1)}
                                    aria-label="Nach unten"
                                  >
                                    <ChevronDownIcon className="size-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-7"
                                    onClick={() => openEditStep(s)}
                                  >
                                    <PencilIcon className="size-3.5" />
                                  </Button>
                                  <ConfirmDelete
                                    label={`„${index + 1}. ${label}" löschen?`}
                                    onConfirm={() => removeStep(s.id)}
                                  />
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                {workLoading ? (
                  <div className="flex flex-col gap-2 py-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : workItems.length === 0 ? (
                  <div className="flex h-full min-h-48 flex-col justify-center gap-2 py-6">
                    <p className="text-sm text-muted-foreground">
                      Keine offenen Leads in dieser Kampagne.
                    </p>
                    <p className="text-[12px] text-muted-foreground/80">
                      Leads unter Zuordnungen hinzufügen.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto py-3">
                      {activeWork && (
                        <div className="flex flex-col gap-4">
                          <div>
                            <p className="text-base font-semibold tracking-tight">
                              {activeWork.company_name}
                            </p>
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              {[contactLabel(activeWork.contact), activeWork.city, activeWork.domain]
                                .filter(Boolean)
                                .join(' · ') || 'Kein Kontakt hinterlegt'}
                            </p>
                            {activeWork.current_step && (
                              <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium">
                                {(() => {
                                  const Icon = stepIcon(activeWork.current_step.type);
                                  return <Icon className="size-3.5 text-muted-foreground" />;
                                })()}
                                Schritt {activeWork.current_step.step_order}: {activeWork.current_step.label}
                                {activeWork.current_step.delay_days > 0 && (
                                  <span className="font-normal text-muted-foreground">
                                    · {delayLabel(activeWork.current_step.delay_days)}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>

                          {(activeWork.contact?.email || activeWork.contact?.phone) && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                              {activeWork.contact.email && (
                                <span className="font-mono">{activeWork.contact.email}</span>
                              )}
                              {activeWork.contact.phone && (
                                <span className="font-mono">{activeWork.contact.phone}</span>
                              )}
                            </div>
                          )}

                          {activeWork.current_step?.uses_template && (
                            <div className="flex flex-col gap-3">
                              {activeWork.rendered.subject ? (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <Label className="text-[11px] text-muted-foreground">Betreff</Label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 gap-1 px-2 text-xs"
                                      onClick={() => handleCopy('subject', activeWork.rendered.subject)}
                                    >
                                      {copiedKey === 'subject' ? (
                                        <CheckIcon className="size-3.5" />
                                      ) : (
                                        <CopyIcon className="size-3.5" />
                                      )}
                                      {copiedKey === 'subject' ? 'Kopiert' : 'Kopieren'}
                                    </Button>
                                  </div>
                                  <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                                    {activeWork.rendered.subject}
                                  </p>
                                </div>
                              ) : null}
                              {activeWork.rendered.body ? (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <Label className="text-[11px] text-muted-foreground">Text</Label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 gap-1 px-2 text-xs"
                                      onClick={() => handleCopy('body', activeWork.rendered.body)}
                                    >
                                      {copiedKey === 'body' ? (
                                        <CheckIcon className="size-3.5" />
                                      ) : (
                                        <CopyIcon className="size-3.5" />
                                      )}
                                      {copiedKey === 'body' ? 'Kopiert' : 'Kopieren'}
                                    </Button>
                                  </div>
                                  <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-sans text-sm leading-relaxed">
                                    {activeWork.rendered.body}
                                  </pre>
                                </div>
                              ) : null}
                              {!activeWork.rendered.subject && !activeWork.rendered.body && (
                                <p className="text-[12px] text-warning">
                                  Keine Vorlage an diesem Schritt — trotzdem erledigen möglich.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 space-y-3 border-t border-border/60 py-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="success-solid"
                          className="h-9 flex-1 gap-1.5"
                          disabled={completing || !activeWork}
                          onClick={() => completeWork('done')}
                        >
                          <CheckIcon className="size-3.5" />
                          {completing ? '…' : 'Erledigt'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 gap-1.5"
                          disabled={completing || !activeWork}
                          onClick={() => completeWork('skipped')}
                        >
                          <SkipForwardIcon className="size-3.5" />
                          Überspringen
                        </Button>
                      </div>

                      {workItems.length > 1 && (
                        <div className="max-h-36 overflow-y-auto">
                          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                            Warteschlange · {workItems.length}
                          </p>
                          <ul className="space-y-0.5">
                            {workItems.map((item) => {
                              const active = item.id === activeWork?.id;
                              return (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    onClick={() => setWorkId(item.id)}
                                    className={cn(
                                      'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
                                      active
                                        ? 'bg-muted font-medium'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                    )}
                                  >
                                    <span className="truncate">{item.company_name}</span>
                                    <span className="shrink-0 font-mono text-[10px] tabular-nums">
                                      {item.current_step?.step_order ?? '—'}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div className={cn('hidden h-full items-center justify-center lg:flex', headerY)}>
            <p className="text-sm text-muted-foreground">Kampagne in der Tabelle wählen</p>
          </div>
        )}
      </aside>

      {/* —— Dialoge —— */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="sm:max-w-md">
          <SaveForm onSave={saveCampaign}>
            <DialogHeader>
              <DialogTitle>
                {editingCampaignId ? 'Kampagne bearbeiten' : 'Neue Kampagne'}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="camp-name">Name</Label>
                <Input
                  id="camp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="camp-desc">Beschreibung</Label>
                <Textarea
                  id="camp-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" className="h-10" onClick={() => setCampaignOpen(false)}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="success-solid"
                className="h-10"
                disabled={savingCampaign || !name.trim()}
              >
                {savingCampaign ? 'Speichern…' : 'Speichern'}
              </Button>
            </DialogFooter>
          </SaveForm>
        </DialogContent>
      </Dialog>

      <Dialog open={stepOpen} onOpenChange={setStepOpen}>
        <DialogContent
          className={cn(
            'flex flex-col gap-0 overflow-hidden p-0',
            stepUsesTemplate(stepType)
              ? 'h-[min(92vh,880px)] sm:max-w-4xl'
              : 'sm:max-w-lg',
          )}
        >
          <SaveForm
            onSave={saveStep}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 pr-14">
              <DialogTitle>{editingStepId ? 'Schritt bearbeiten' : 'Schritt hinzufügen'}</DialogTitle>
            </DialogHeader>

            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col gap-6 px-6 py-5',
                stepUsesTemplate(stepType) ? 'overflow-hidden' : 'overflow-y-auto',
              )}
            >
              <div className="grid shrink-0 gap-5 sm:grid-cols-2 sm:gap-6">
                <div className="flex flex-col gap-1.5">
                  <Label>Aktion</Label>
                  <Select value={stepType} onValueChange={(v) => setStepType(v as CampaignStepType)}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_STEP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="step-delay">
                    Wartezeit in Tagen
                    <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="step-delay"
                    type="number"
                    min={0}
                    value={stepDelay}
                    onChange={(e) => setStepDelay(e.target.value)}
                    className="h-10"
                    placeholder="0"
                  />
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Leer oder 0 = sofort · nur Anzeige
                  </p>
                </div>
              </div>

              {stepUsesTemplate(stepType) && (
                <div className="flex min-h-0 flex-1 flex-col gap-4 border-t border-border/60 pt-5">
                  <div className="shrink-0 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {stepUsesSubject(stepType) ? 'E-Mail-Vorlage' : 'Text-Vorlage'}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {stepUsesSubject(stepType)
                        ? 'Besteht aus Betreff und Text'
                        : 'Text zum Kopieren beim Abarbeiten'}
                    </p>
                  </div>

                  <TemplateEditorFields
                    withSubject={stepUsesSubject(stepType)}
                    subject={stepSubject}
                    body={stepBody}
                    onSubjectChange={setStepSubject}
                    onBodyChange={setStepBody}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
              <Button type="button" variant="outline" className="h-10" onClick={() => setStepOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" variant="success-solid" className="h-10" disabled={savingStep}>
                {savingStep ? 'Speichern…' : 'Speichern'}
              </Button>
            </DialogFooter>
          </SaveForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}
