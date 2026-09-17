'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { fmtHms } from '@/lib/time-entry-utils';

const STORAGE_PREFIX = 'cherry-os-accumulated:';
const SESSION_PREFIX = 'cherry-os-timer-session:';

type TimerSession = { id: string; title: string; startedAt: number };
type RunningRow = { id?: string; task_id?: string; title?: string; started_at?: string } | null;

function isPublicPath(path: string) {
  return path === '/login' || path.startsWith('/login/');
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function sessionKey(userId: string) {
  return `${SESSION_PREFIX}${userId}`;
}

function loadAccumulated(userId: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function persistAccumulated(userId: string | null, acc: Record<string, number>) {
  if (!userId) return;
  localStorage.setItem(storageKey(userId), JSON.stringify(acc));
}

function loadSession(userId: string): TimerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(sessionKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimerSession;
    if (!parsed?.id || !parsed.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(userId: string | null, session: TimerSession | null) {
  if (!userId) return;
  if (!session) {
    localStorage.removeItem(sessionKey(userId));
    return;
  }
  localStorage.setItem(sessionKey(userId), JSON.stringify(session));
}

type TimerContextType = {
  userId: string | null;
  activeId: string | null;
  activeEntryId: string | null;
  activeTitle: string | null;
  /** Live-Sekunden der gerade laufenden Session (nicht lokal akkumuliert) */
  liveSecs: number;
  fmtLive: string;
  /** Gesamte akkumulierte Sekunden für eine beliebige Aufgabe */
  getTaskSecs: (id: string) => number;
  startTask: (id: string, title: string, startedAtMs?: number) => Promise<void>;
  stopTask: () => Promise<void>;
  /** Titel der laufenden Erfassung aktualisieren (Banner / Leiste) */
  updateActiveTitle: (title: string) => void;
  /** Schließt die Zeiterfassung ab: gibt Gesamtsekunden zurück und löscht den Eintrag */
  finishTask: (id: string) => Promise<number>;
};

const TimerContext = createContext<TimerContextType>({
  userId: null,
  activeId: null,
  activeEntryId: null,
  activeTitle: null,
  liveSecs: 0,
  fmtLive: '00:00:00',
  getTaskSecs: () => 0,
  startTask: async () => {},
  stopTask: async () => {},
  updateActiveTitle: () => {},
  finishTask: async () => 0,
});

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const authed = !isPublicPath(path);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [accumulated, setAccumulated] = useState<Record<string, number>>({});
  const startRef = useRef<number | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const mutatingRef = useRef(0);
  const [tick, setTick] = useState(0);

  activeIdRef.current = activeId;

  const applyRunning = useCallback((row: RunningRow) => {
    const userId = userIdRef.current;
    if (row?.task_id && row.started_at) {
      const startedAt = new Date(row.started_at).getTime();
      if (activeIdRef.current !== row.task_id) {
        setActiveTitle(row.title ?? null);
      }
      setActiveId(row.task_id);
      setActiveEntryId(row.id ?? null);
      startRef.current = startedAt;
      persistSession(userId, { id: row.task_id, title: row.title ?? '', startedAt });
      return;
    }
    persistSession(userId, null);
    startRef.current = null;
    setActiveId(null);
    setActiveEntryId(null);
    setActiveTitle(null);
  }, []);

  const hydrateFromDb = useCallback(async () => {
    if (mutatingRef.current) return;
    const gen = mutatingRef.current;
    try {
      const sessRes = await fetch('/api/auth/session');
      if (mutatingRef.current !== gen) return;
      const sess = sessRes.ok ? await sessRes.json() as { user?: { id?: string } } : null;
      const userId = sess?.user?.id ?? null;
      userIdRef.current = userId;
      setUserId(userId);
      if (userId) setAccumulated(loadAccumulated(userId));
      if (!userId) {
        applyRunning(null);
        return;
      }

      const r = await fetch('/api/time-entries/running');
      if (mutatingRef.current !== gen) return;
      if (r.status === 401) {
        applyRunning(null);
        return;
      }
      if (r.ok) {
        const row = await r.json() as RunningRow;
        if (mutatingRef.current !== gen) return;
        applyRunning(row);
        return;
      }
    } catch {
      // offline: localStorage als Fallback
    }
    if (mutatingRef.current !== gen) return;
    const userId = userIdRef.current;
    if (!userId) return;
    const session = loadSession(userId);
    if (!session) return;
    setActiveId(session.id);
    setActiveTitle(session.title);
    startRef.current = session.startedAt;
  }, [applyRunning]);

  useEffect(() => {
    if (!authed) {
      userIdRef.current = null;
      setUserId(null);
      startRef.current = null;
      setActiveId(null);
      setActiveEntryId(null);
      setActiveTitle(null);
      return;
    }
    void hydrateFromDb();
  }, [authed, hydrateFromDb]);

  useEffect(() => {
    if (!authed) return;
    function onVis() {
      if (document.visibilityState === 'visible') void hydrateFromDb();
    }
    document.addEventListener('visibilitychange', onVis);
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') void hydrateFromDb();
    }, 15000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(iv);
    };
  }, [authed, hydrateFromDb]);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(iv);
  }, []);

  function getTaskSecs(id: string): number {
    const base = accumulated[id] ?? 0;
    if (activeId === id && startRef.current) {
      return base + Math.floor((Date.now() - startRef.current) / 1000);
    }
    return base;
  }

  const liveSecs = activeId && startRef.current
    ? Math.max(0, Math.floor((Date.now() - startRef.current) / 1000))
    : 0;

  async function startTask(id: string, title: string, startedAtMs?: number) {
    mutatingRef.current += 1;
    let startedAt = startedAtMs ?? Date.now();

    try {
      if (startedAtMs == null) {
        const r = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: id, title }),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (data?.started_at) startedAt = new Date(data.started_at).getTime();
        if (data?.id) setActiveEntryId(data.id as string);
      }

      if (activeId && activeId !== id && startRef.current) {
        const running = Math.floor((Date.now() - startRef.current) / 1000);
        const updated = { ...accumulated, [activeId]: (accumulated[activeId] ?? 0) + running };
        setAccumulated(updated);
        persistAccumulated(userIdRef.current, updated);
      }
      setActiveId(id);
      setActiveTitle(title);
      startRef.current = startedAt;
      persistSession(userIdRef.current, { id, title, startedAt });
    } catch {
      // ohne DB-Start nicht lokal weiterlaufen lassen
    } finally {
      mutatingRef.current -= 1;
    }
  }

  async function stopTask() {
    mutatingRef.current += 1;
    try {
      const r = await fetch('/api/time-entries/stop', { method: 'POST' });
      if (!r.ok) return;
      if (!activeId || !startRef.current) {
        persistSession(userIdRef.current, null);
        startRef.current = null;
        setActiveId(null);
        setActiveEntryId(null);
        setActiveTitle(null);
        return;
      }
      const running = Math.floor((Date.now() - startRef.current) / 1000);
      const updated = { ...accumulated, [activeId]: (accumulated[activeId] ?? 0) + running };
      setAccumulated(updated);
      persistAccumulated(userIdRef.current, updated);
      startRef.current = null;
      setActiveId(null);
      setActiveEntryId(null);
      setActiveTitle(null);
      persistSession(userIdRef.current, null);
    } catch {
      // lokal weiterlaufen lassen, DB ist Quelle
    } finally {
      mutatingRef.current -= 1;
    }
  }

  function updateActiveTitle(title: string) {
    setActiveTitle(title);
    if (!activeId || !startRef.current) return;
    persistSession(userIdRef.current, { id: activeId, title, startedAt: startRef.current });
  }

  async function finishTask(id: string): Promise<number> {
    const total = getTaskSecs(id);

    if (activeId === id) {
      mutatingRef.current += 1;
      try {
        const r = await fetch('/api/time-entries/stop', { method: 'POST' });
        if (!r.ok) return total;
        startRef.current = null;
        setActiveId(null);
        setActiveEntryId(null);
        setActiveTitle(null);
        persistSession(userIdRef.current, null);
      } catch {
        return total;
      } finally {
        mutatingRef.current -= 1;
      }
    }

    const updated = { ...accumulated };
    delete updated[id];
    setAccumulated(updated);
    persistAccumulated(userIdRef.current, updated);

    return total;
  }

  void tick;

  return (
    <TimerContext.Provider value={{
      userId,
      activeId,
      activeEntryId,
      activeTitle,
      liveSecs,
      fmtLive: fmtHms(liveSecs),
      getTaskSecs,
      startTask,
      stopTask,
      updateActiveTitle,
      finishTask,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}
