'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { campaignStepMeta, delayLabel } from '@/lib/leads/campaign-steps';
import {
  splitHeaderY,
  splitLeftPad,
  splitLeftPadEnd,
  splitMidPad,
  splitRightPad,
} from '@/lib/page-layout';
import { cn } from '@/lib/utils';
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  InboxIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  ScrollTextIcon,
  SkipForwardIcon,
  TimerIcon,
  type LucideIcon,
} from 'lucide-react';

type InboxItem = {
  id: string;
  campaign_id: string;
  campaign_name: string;
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

type CampaignFacet = { id: string; name: string; n: number };

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

function contactLabel(c: InboxItem['contact']) {
  if (!c) return null;
  const name = [c.salutation, c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return name || null;
}

function domainHref(domain: string) {
  const d = domain.trim();
  if (!d) return null;
  if (/^https?:\/\//i.test(d)) return d;
  return `https://${d}`;
}

function domainLabel(domain: string) {
  return domain.replace(/^https?:\/\//i, '').replace(/\/$/, '');
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

const leftPad = splitLeftPad;
const leftPadEnd = splitLeftPadEnd;
const midPad = splitMidPad;
const rightPad = splitRightPad;
const headerY = splitHeaderY;

export function WorkInbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignFacet[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const [inboxRes, campsRes] = await Promise.all([
      fetch('/api/work/inbox', { signal }),
      fetch('/api/campaigns', { signal }),
    ]);
    const inboxData = await inboxRes.json();
    const campsData = await campsRes.json();
    if (signal?.aborted) return;

    const next: InboxItem[] = inboxData.items ?? [];
    const counts = new Map<string, number>(
      ((inboxData.campaigns ?? []) as CampaignFacet[]).map((c) => [c.id, c.n]),
    );
    const allCampaigns: CampaignFacet[] = ((campsData.campaigns ?? []) as {
      id: string;
      name: string;
    }[]).map((c) => ({
      id: c.id,
      name: c.name,
      n: counts.get(c.id) ?? 0,
    }));
    // Kampagnen mit offenen Tasks zuerst, dann Name
    allCampaigns.sort((a, b) => {
      if (b.n !== a.n) return b.n - a.n;
      return a.name.localeCompare(b.name, 'de');
    });

    setItems(next);
    setCampaigns(allCampaigns);
    setActiveId((prev) => (prev && next.some((i) => i.id === prev) ? prev : next[0]?.id ?? null));
    setLoading(false);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const filtered = useMemo(() => {
    if (campaignFilter === 'all') return items;
    return items.filter((i) => i.campaign_id === campaignFilter);
  }, [items, campaignFilter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setActiveId(null);
      return;
    }
    setActiveId((prev) =>
      prev && filtered.some((i) => i.id === prev) ? prev : filtered[0]!.id,
    );
  }, [filtered]);

  const active = useMemo(
    () => (activeId ? filtered.find((i) => i.id === activeId) ?? null : null),
    [filtered, activeId],
  );

  function selectItem(id: string) {
    setActiveId(id);
    setShowMobileDetail(true);
  }

  async function handleCopy(key: string, text: string) {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
  }

  async function complete(action: 'done' | 'skipped') {
    if (!active || completing) return;
    setCompleting(true);
    const res = await fetch(`/api/campaign-leads/${active.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setCompleting(false);
    if (!res.ok) return;
    const data = await res.json();
    if (data.finished) {
      const doneId = active.id;
      const doneCampaign = active.campaign_id;
      const filterId = campaignFilter;
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== doneId);
        const nextVisible =
          filterId === 'all' ? next : next.filter((i) => i.campaign_id === filterId);
        const prevVisible =
          filterId === 'all' ? prev : prev.filter((i) => i.campaign_id === filterId);
        const idx = prevVisible.findIndex((i) => i.id === doneId);
        const fallback = nextVisible[idx] ?? nextVisible[idx - 1] ?? nextVisible[0] ?? null;
        setActiveId(fallback?.id ?? null);
        if (!fallback) setShowMobileDetail(false);
        return next;
      });
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === doneCampaign ? { ...c, n: Math.max(0, c.n - 1) } : c,
        ),
      );
    } else {
      await load();
    }
  }

  return (
    <div className="flex h-full min-h-0">
      {/* 1 · Kampagnen-Filter */}
      <aside
        className={cn(
          'hidden w-64 shrink-0 flex-col border-r border-border/60 lg:flex xl:w-72',
          leftPad,
          leftPadEnd,
        )}
      >
        <div className={cn('shrink-0', headerY)}>
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
            {loading ? '…' : `${items.length} offen`}
          </p>
        </div>
        <p className="mb-1.5 shrink-0 font-mono text-[10px] tracking-wide text-muted-foreground">
          Kampagne
        </p>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-6">
          <button
            type="button"
            onClick={() => {
              setCampaignFilter('all');
              setShowMobileDetail(false);
            }}
            className={cn(
              '-mx-2 flex w-[calc(100%+1rem)] items-center justify-between rounded-md px-2 py-2 text-left text-[12px] font-medium transition-colors',
              campaignFilter === 'all'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <span>Alle</span>
            <span className="font-mono tabular-nums opacity-70">{items.length}</span>
          </button>
          {campaigns.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCampaignFilter(c.id);
                setShowMobileDetail(false);
              }}
              className={cn(
                '-mx-2 flex w-[calc(100%+1rem)] items-start justify-between gap-3 rounded-md px-2 py-2 text-left text-[12px] font-medium transition-colors',
                campaignFilter === c.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <span className="min-w-0 flex-1 text-pretty break-words leading-snug">
                {c.name}
              </span>
              <span className="shrink-0 pt-0.5 font-mono tabular-nums opacity-70">{c.n}</span>
            </button>
          ))}
          {!loading && campaigns.length === 0 && (
            <p className="py-2 text-[12px] text-muted-foreground">
              Noch keine Kampagnen.
            </p>
          )}
        </nav>
      </aside>

      {/* 2 · Einfache Liste */}
      <div
        className={cn(
          'flex w-full min-h-0 min-w-0 flex-col border-r border-border/60 lg:w-80 lg:shrink-0 xl:w-96',
          midPad,
          showMobileDetail ? 'hidden lg:flex' : 'flex',
        )}
      >
        <header className={cn('flex shrink-0 flex-col gap-3 lg:hidden', headerY)}>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
            <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
              {loading ? '…' : `${filtered.length} offen`}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setCampaignFilter('all');
              }}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                campaignFilter === 'all'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              Alle · {items.length}
            </button>
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCampaignFilter(c.id);
                }}
                className={cn(
                  'rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                  campaignFilter === c.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {c.name} · {c.n}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pt-6 pb-6 [scrollbar-width:none] [-ms-overflow-style:none] lg:pt-6 [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="flex flex-col gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 py-10 text-center">
              <InboxIcon className="size-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Keine offenen Aufgaben.</p>
            </div>
          ) : (
            <ul className="-mx-1">
              {filtered.map((item) => {
                const selected = item.id === active?.id;
                const stepLabel = item.current_step
                  ? campaignStepMeta(item.current_step.type).shortLabel
                  : '—';
                const contact = contactLabel(item.contact);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectItem(item.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors',
                        selected
                          ? 'bg-muted'
                          : 'hover:bg-muted/50',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {item.company_name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {contact ?? 'Kein Kontakt'}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {stepLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* 3 · Aktion (E-Mail senden etc.) */}
      <aside
        className={cn(
          'min-h-0 w-full min-w-0 flex-col lg:flex lg:flex-1',
          rightPad,
          showMobileDetail ? 'flex' : 'hidden lg:flex',
        )}
      >
        {!active ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Lead in der Liste wählen
            </p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto pt-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-start gap-3 border-b border-border/60 pb-4">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="-ml-1.5 mt-0.5 size-8 shrink-0 lg:hidden"
                  onClick={() => setShowMobileDetail(false)}
                >
                  <ArrowLeftIcon className="size-4" />
                </Button>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    {active.current_step?.label ?? 'Schritt'}
                  </p>
                  <h2 className="truncate text-lg font-semibold tracking-tight">
                    {active.company_name}
                  </h2>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {[contactLabel(active.contact), active.city]
                      .filter(Boolean)
                      .join(' · ') || active.campaign_name}
                  </p>
                  {active.domain && (() => {
                    const href = domainHref(active.domain);
                    if (!href) return null;
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block max-w-full truncate font-mono text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {domainLabel(active.domain)}
                      </a>
                    );
                  })()}
                  {active.current_step && active.current_step.delay_days > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {delayLabel(active.current_step.delay_days)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-5 py-5">
                {(active.contact?.email || active.contact?.phone) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                    {active.contact.email && (
                      <span className="font-mono">{active.contact.email}</span>
                    )}
                    {active.contact.phone && (
                      <span className="font-mono">{active.contact.phone}</span>
                    )}
                  </div>
                )}

                {active.current_step?.uses_template ? (
                  <div className="flex flex-col gap-5">
                    {active.rendered.subject ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-[11px] text-muted-foreground">Betreff</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => handleCopy('subject', active.rendered.subject)}
                          >
                            {copiedKey === 'subject' ? (
                              <CheckIcon className="size-3.5" />
                            ) : (
                              <CopyIcon className="size-3.5" />
                            )}
                            {copiedKey === 'subject' ? 'Kopiert' : 'Kopieren'}
                          </Button>
                        </div>
                        <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
                          {active.rendered.subject}
                        </p>
                      </div>
                    ) : null}
                    {active.rendered.body ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-[11px] text-muted-foreground">Text</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => handleCopy('body', active.rendered.body)}
                          >
                            {copiedKey === 'body' ? (
                              <CheckIcon className="size-3.5" />
                            ) : (
                              <CopyIcon className="size-3.5" />
                            )}
                            {copiedKey === 'body' ? 'Kopiert' : 'Kopieren'}
                          </Button>
                        </div>
                        <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 font-sans text-sm leading-relaxed">
                          {active.rendered.body}
                        </pre>
                      </div>
                    ) : null}
                    {!active.rendered.subject && !active.rendered.body && (
                      <p className="text-[12px] text-warning">
                        Keine Vorlage — trotzdem erledigen möglich.
                      </p>
                    )}
                  </div>
                ) : active.current_step ? (
                  <p className="text-sm text-muted-foreground">
                    {campaignStepMeta(active.current_step.type).label} manuell erledigen, dann bestätigen.
                  </p>
                ) : (
                  <p className="text-[12px] text-warning">
                    Kein Schritt — unter Kampagnen anlegen.
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-border/60 pt-4 pb-6">
              <Button
                type="button"
                variant="success-solid"
                className="h-10 flex-1 gap-1.5"
                disabled={completing}
                onClick={() => complete('done')}
              >
                <CheckIcon className="size-3.5" />
                {completing ? '…' : 'Erledigt'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-1.5"
                disabled={completing}
                onClick={() => complete('skipped')}
              >
                <SkipForwardIcon className="size-3.5" />
                Überspringen
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
