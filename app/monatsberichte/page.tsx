'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { fmtHms } from '@/lib/time-entry-utils';

type ReportEntry = {
  id: string;
  title: string;
  started_at: string;
  stopped_at: string | null;
  duration_seconds: number;
};

type ReportProject = {
  project_id: string;
  name: string;
  firma: string;
  total_seconds: number;
  entries: ReportEntry[];
};

type Report = {
  month: string;
  summary: {
    total_seconds: number;
    entry_count: number;
    project_count: number;
  };
  projects: ReportProject[];
};

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y!, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_DE[(m ?? 1) - 1] ?? key} ${y}`;
}

function entryDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function MonatsberichtePage() {
  const [month, setMonth] = useState(currentMonthKey);
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/monatsberichte?month=${encodeURIComponent(m)}`);
      if (!r.ok) {
        setData(null);
        return;
      }
      const json = (await r.json()) as Report;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [month, load]);

  const summary = data?.summary;

  return (
    <PageContainer>
      <PageHeader
        title="Monatsberichte"
        subtitle="Zeiterfassung nach Projekt"
        actions={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              aria-label="Vorheriger Monat"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="min-w-[9.5rem] text-center font-mono text-[12px] tracking-wide">
              {monthLabel(month)}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              aria-label="Nächster Monat"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !data || !summary ? (
        <p className="py-4 text-sm text-muted-foreground">Bericht konnte nicht geladen werden.</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-x-5 gap-y-1 border-b border-border/60 pb-4 font-mono text-[12px] tracking-wide text-muted-foreground">
            <span>
              <span className="text-foreground">{fmtHms(summary.total_seconds)}</span>
              {' '}gesamt
            </span>
            <span>
              <span className="text-foreground">{summary.entry_count}</span>
              {' '}Einträge
            </span>
            <span>
              <span className="text-foreground">{summary.project_count}</span>
              {' '}Projekte
            </span>
          </div>

          {data.projects.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Keine Zeiteinträge in {monthLabel(month)}.
            </p>
          ) : (
            <div className="flex flex-col gap-8">
              {data.projects.map((p) => (
                <section key={p.project_id}>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold tracking-tight">{p.name}</h2>
                      {p.firma ? (
                        <p className="mt-0.5 font-mono text-[11px] tracking-wide text-muted-foreground">
                          {p.firma}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                      {fmtHms(p.total_seconds)}
                    </span>
                  </div>
                  <ul className="divide-y divide-border/60 border-y border-border/60">
                    {p.entries.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-start justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm">{e.title}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {entryDateLabel(e.started_at)}
                            {!e.stopped_at ? ' · läuft' : ''}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                          {fmtHms(e.duration_seconds)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
