'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Building2Icon,
  CheckCircle2Icon,
  CrosshairIcon,
  MegaphoneIcon,
  SearchIcon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Stats = {
  leads: {
    total: number;
    complete: number;
    with_domain: number;
    with_phone: number;
    with_contact: number;
    without_contact: number;
    completion_rate: number;
  };
  by_status: { status: string; n: number }[];
  contacts: { total: number };
  campaigns: {
    total: number;
    assignments: number;
    leads_in_campaigns: number;
  };
  searches: {
    total: number;
    searched: number;
    pending: number;
  };
};

const STATUS_DE: Record<string, string> = {
  complete: 'Vollständig',
  raw: 'Roh',
  error_incomplete: 'Unvollständig',
  error_no_domain: 'Ohne Domain',
};

const STATUS_BAR: Record<string, string> = {
  complete: 'bg-success',
  raw: 'bg-info',
  error_incomplete: 'bg-warning',
  error_no_domain: 'bg-danger',
};

const STATUS_DOT: Record<string, string> = {
  complete: 'bg-success',
  raw: 'bg-info',
  error_incomplete: 'bg-warning',
  error_no_domain: 'bg-danger',
};

function formatN(n: number) {
  return new Intl.NumberFormat('de-DE').format(n);
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function CompletionRing({ rate }: { rate: number }) {
  const r = 15.9155;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;

  return (
    <div className="relative size-28 shrink-0 md:size-32">
      <svg viewBox="0 0 36 36" className="size-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          className="stroke-muted"
          strokeWidth="2.5"
        />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          className="stroke-success transition-[stroke-dashoffset] duration-700 ease-out"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
          {rate}%
        </span>
        <span className="font-mono text-[10px] tracking-wide text-muted-foreground">
          komplett
        </span>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: typeof CrosshairIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex aspect-[5/3] flex-col justify-between rounded-xl border border-border/60 bg-muted/20 px-5 py-5 transition-colors hover:border-border hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight tabular-nums md:text-4xl">{value}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-xl border border-border/60 bg-muted/15 p-5 md:p-6',
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LeadsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/leads/stats')
      .then(async (r) => {
        if (!r.ok) throw new Error('Stats konnten nicht geladen werden');
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Fehler'));
  }, []);

  if (error) {
    return <p className="py-8 text-sm text-muted-foreground">{error}</p>;
  }

  if (!stats) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[5/3] w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const { leads, contacts, campaigns, searches } = stats;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="flex flex-col gap-6 rounded-xl border border-border/60 bg-muted/20 p-6 md:flex-row md:items-center md:justify-between md:gap-10 md:p-8">
        <div className="flex items-center gap-6 md:gap-8">
          <CompletionRing rate={leads.completion_rate} />
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground">Pipeline</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums md:text-4xl">
              {formatN(leads.total)}
              <span className="ml-2 text-lg font-normal text-muted-foreground md:text-xl">Leads</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatN(leads.complete)} vollständig · {formatN(leads.without_contact)} ohne Kontakt
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-border/60 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <div>
            <p className="font-mono text-[10px] tracking-wide text-muted-foreground">Domain</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{pct(leads.with_domain, leads.total)}%</p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-wide text-muted-foreground">Telefon</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{pct(leads.with_phone, leads.total)}%</p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-wide text-muted-foreground">Kontakt</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{pct(leads.with_contact, leads.total)}%</p>
          </div>
        </div>
      </section>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Leads"
          value={formatN(leads.total)}
          hint={`${formatN(leads.complete)} vollständig`}
          href="/leads"
          icon={CrosshairIcon}
        />
        <MetricTile
          label="Kontakte"
          value={formatN(contacts.total)}
          hint={`${formatN(leads.with_contact)} Leads abgedeckt`}
          href="/leads/kontakte"
          icon={UsersIcon}
        />
        <MetricTile
          label="Kampagnen"
          value={formatN(campaigns.leads_in_campaigns)}
          hint={`${formatN(campaigns.total)} aktiv · ${formatN(campaigns.assignments)} Zuordnungen`}
          href="/leads/zuordnungen"
          icon={MegaphoneIcon}
        />
        <MetricTile
          label="Suchen"
          value={formatN(searches.total)}
          hint={`${formatN(searches.pending)} offen · ${formatN(searches.searched)} erledigt`}
          href="/leads/suchen"
          icon={SearchIcon}
        />
      </div>

      {/* Status + Quality */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Status-Verteilung"
          action={(
            <Link href="/leads" className="font-mono text-[11px] text-muted-foreground hover:text-foreground">
              Alle Leads →
            </Link>
          )}
        >
          {stats.by_status.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Daten</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {stats.by_status.map((row) => (
                <li key={row.status}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span className={cn('size-2 rounded-full', STATUS_DOT[row.status] ?? 'bg-foreground/50')} />
                      {STATUS_DE[row.status] ?? row.status}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatN(row.n)} · {pct(row.n, leads.total)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width] duration-500',
                        STATUS_BAR[row.status] ?? 'bg-foreground/70',
                      )}
                      style={{ width: `${pct(row.n, leads.total)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Datenqualität">
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Mit Domain',
                n: leads.with_domain,
                icon: Building2Icon,
              },
              {
                label: 'Mit Telefon',
                n: leads.with_phone,
                icon: CheckCircle2Icon,
              },
              {
                label: 'Mit Kontakt',
                n: leads.with_contact,
                icon: UserRoundIcon,
              },
              {
                label: 'Ohne Kontakt',
                n: leads.without_contact,
                icon: UserRoundIcon,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col justify-between rounded-lg border border-border/50 bg-background/60 px-4 py-4"
              >
                <item.icon className="size-4 text-muted-foreground" />
                <div className="mt-6">
                  <p className="text-2xl font-semibold tabular-nums">{formatN(item.n)}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {item.label}
                    <span className="text-muted-foreground/70"> · {pct(item.n, leads.total)}%</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
