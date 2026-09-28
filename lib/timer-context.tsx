'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
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
  pending: boolean;
  startedAtMs: number | null;
  getTaskSecs: (id: string) => number;
  startTask: (id: string, title: string, restart?: boolean) => Promise<void>;
  stopTask: (opts?: { localOnly?: boolean }) => Promise<void>;
  updateActiveTitle: (title: string) => void;
  beginTimerEdit: () => void;
  endTimerEdit: () => void;
  registerRunningFlush: (fn: (() => Promise<void>) | null) => void;
  syncRunningStartedAt: (startedAtMs: number) => void;
  finishTask: (id: string) => Promise<number>;
};

const TimerContext = createContext<TimerContextType>({
  userId: null,
  activeId: null,
  activeEntryId: null,
  activeTitle: null,
  pending: false,
  startedAtMs: null,
  getTaskSecs: () => 0,
  startTask: async () => {},
  stopTask: async () => {},
  updateActiveTitle: () => {},
  beginTimerEdit: () => {},
  endTimerEdit: () => {},
  registerRunningFlush: () => {},
  syncRunningStartedAt: () => {},
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
  const [pending, setPending] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const activeEntryIdRef = useRef<string | null>(null);
  const activeTitleRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const opChain = useRef(Promise.resolve());
  const pendingRef = useRef(false);
  const inflightRef = useRef(0);
  const editCountRef = useRef(0);
  const runningFlushRef = useRef<(() => Promise<void>) | null>(null);

  activeIdRef.current = activeId;
  activeEntryIdRef.current = activeEntryId;
  activeTitleRef.current = activeTitle;

  const resetLocal = useCallback(() => {
    persistSession(userIdRef.current, null);
    startRef.current = null;
    setStartedAtMs(null);
    setActiveId(null);
    setActiveEntryId(null);
    setActiveTitle(null);
  }, []);

  const hydrateFromDb = useCallback(async (mode: 'full' | 'running' = 'full', force = false) => {
    if (pendingRef.current && !force) return;
    try {
      if (mode === 'full' || !userIdRef.current) {
        const sessRes = await fetch('/api/auth/session');
        const sess = sessRes.ok ? await sessRes.json() as { user?: { id?: string } } : null;
        const nextUser = sess?.user?.id ?? null;
        userIdRef.current = nextUser;
        setUserId(nextUser);
        if (nextUser) setAccumulated(loadAccumulated(nextUser));
        if (!nextUser) {
          resetLocal();
          return;
        }
      }

      const r = await fetch('/api/time-entries/running');
      if (r.status === 401) {
        resetLocal();
        return;
      }
      if (!r.ok) return;
      const row = await r.json() as RunningRow;
      const uid = userIdRef.current;
      const editing = editCountRef.current > 0 && !force;
      if (row?.task_id && row.started_at) {
        const startedAt = new Date(row.started_at).getTime();
        const sameEntry = Boolean(row.id && activeEntryIdRef.current === row.id);
        if (editing && sameEntry) return;
        if (!sameEntry || !startRef.current || Math.abs(startRef.current - startedAt) > 1000) {
          startRef.current = startedAt;
        }
        setStartedAtMs(startedAt);
        setActiveId(row.task_id);
        setActiveEntryId(row.id ?? null);
        if (!sameEntry) {
          setActiveTitle(row.title ?? null);
          persistSession(uid, { id: row.task_id, title: row.title ?? '', startedAt });
        }
        return;
      }
      if (editing) return;
      resetLocal();
    } catch {
      const uid = userIdRef.current;
      if (!uid) return;
      const session = loadSession(uid);
      if (!session) return;
      setActiveId(session.id);
      setActiveTitle(session.title);
      startRef.current = session.startedAt;
      setStartedAtMs(session.startedAt);
    }
  }, [resetLocal]);

  useEffect(() => {
    if (!authed) {
      userIdRef.current = null;
      setUserId(null);
      resetLocal();
      return;
    }
    void hydrateFromDb('full');
  }, [authed, hydrateFromDb, resetLocal]);

  useEffect(() => {
    if (!authed) return;
    function onVis() {
      if (document.visibilityState === 'visible') void hydrateFromDb('running');
    }
    document.addEventListener('visibilitychange', onVis);
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') void hydrateFromDb('running');
    }, 20000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(iv);
    };
  }, [authed, hydrateFromDb]);

  const enqueue = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    inflightRef.current += 1;
    pendingRef.current = true;
    setPending(true);
    const run = opChain.current.then(() => fn());
    opChain.current = run.then(() => undefined, () => undefined);
    void run.finally(() => {
      inflightRef.current -= 1;
      if (inflightRef.current === 0) {
        pendingRef.current = false;
        setPending(false);
      }
    });
    return run;
  }, []);

  const getTaskSecs = useCallback((id: string): number => {
    const base = accumulated[id] ?? 0;
    if (activeId === id && startRef.current) {
      return base + Math.floor((Date.now() - startRef.current) / 1000);
    }
    return base;
  }, [accumulated, activeId]);

  const startTask = useCallback(async (id: string, title: string, restart = false) => {
    await enqueue(async () => {
      if (!restart && activeIdRef.current === id && activeEntryIdRef.current) return;

      const r = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: id, title }),
      });
      if (!r.ok) {
        await hydrateFromDb('running', true);
        return;
      }
      const data = await r.json() as { id?: string; started_at?: string };
      const startedAt = data?.started_at ? new Date(data.started_at).getTime() : Date.now();

      if (activeIdRef.current && activeIdRef.current !== id && startRef.current) {
        const running = Math.floor((Date.now() - startRef.current) / 1000);
        const prev = activeIdRef.current;
        setAccumulated(acc => {
          const updated = { ...acc, [prev]: (acc[prev] ?? 0) + running };
          persistAccumulated(userIdRef.current, updated);
          return updated;
        });
      }

      setActiveId(id);
      setActiveEntryId(data?.id ?? null);
      setActiveTitle(title);
      startRef.current = startedAt;
      setStartedAtMs(startedAt);
      persistSession(userIdRef.current, { id, title, startedAt });
    });
  }, [enqueue, hydrateFromDb]);

  const registerRunningFlush = useCallback((fn: (() => Promise<void>) | null) => {
    runningFlushRef.current = fn;
  }, []);

  const stopTask = useCallback(async (opts?: { localOnly?: boolean }) => {
    await enqueue(async () => {
      if (!opts?.localOnly) {
        try {
          await runningFlushRef.current?.();
        } catch {
          // Stop trotzdem ausführen
        }
        if (!activeIdRef.current && !activeEntryIdRef.current) return;
        const r = await fetch('/api/time-entries/stop', { method: 'POST' });
        if (!r.ok) return;
      }

      if (!opts?.localOnly && activeIdRef.current && startRef.current) {
        const runningSecs = Math.floor((Date.now() - startRef.current) / 1000);
        const id = activeIdRef.current;
        setAccumulated(acc => {
          const updated = { ...acc, [id]: (acc[id] ?? 0) + runningSecs };
          persistAccumulated(userIdRef.current, updated);
          return updated;
        });
      }

      persistSession(userIdRef.current, null);
      startRef.current = null;
      setStartedAtMs(null);
      setActiveId(null);
      setActiveEntryId(null);
      setActiveTitle(null);
    });
  }, [enqueue]);

  const updateActiveTitle = useCallback((title: string) => {
    setActiveTitle(title);
    if (!activeIdRef.current || !startRef.current) return;
    persistSession(userIdRef.current, {
      id: activeIdRef.current,
      title,
      startedAt: startRef.current,
    });
  }, []);

  const beginTimerEdit = useCallback(() => {
    editCountRef.current += 1;
  }, []);

  const endTimerEdit = useCallback(() => {
    editCountRef.current = Math.max(0, editCountRef.current - 1);
  }, []);

  const syncRunningStartedAt = useCallback((nextMs: number) => {
    if (!activeIdRef.current) return;
    startRef.current = nextMs;
    setStartedAtMs(nextMs);
    persistSession(userIdRef.current, {
      id: activeIdRef.current,
      title: activeTitleRef.current ?? '',
      startedAt: nextMs,
    });
  }, []);

  const finishTask = useCallback(async (id: string): Promise<number> => {
    const total = getTaskSecs(id);
    if (activeIdRef.current === id) await stopTask();
    setAccumulated(acc => {
      if (!(id in acc)) return acc;
      const updated = { ...acc };
      delete updated[id];
      persistAccumulated(userIdRef.current, updated);
      return updated;
    });
    return total;
  }, [getTaskSecs, stopTask]);

  const value = useMemo(() => ({
    userId,
    activeId,
    activeEntryId,
    activeTitle,
    pending,
    startedAtMs,
    getTaskSecs,
    startTask,
    stopTask,
    updateActiveTitle,
    beginTimerEdit,
    endTimerEdit,
    registerRunningFlush,
    syncRunningStartedAt,
    finishTask,
  }), [
    userId, activeId, activeEntryId, activeTitle, pending, startedAtMs,
    getTaskSecs, startTask, stopTask, updateActiveTitle,
    beginTimerEdit, endTimerEdit, registerRunningFlush, syncRunningStartedAt, finishTask,
  ]);

  return (
    <TimerContext.Provider value={value}>
      <TimerTick activeId={activeId} startRef={startRef}>
        {children}
      </TimerTick>
    </TimerContext.Provider>
  );
}

type TickContextType = { now: number; liveSecs: number; fmtLive: string };

const TickContext = createContext<TickContextType>({
  now: 0,
  liveSecs: 0,
  fmtLive: '00:00:00',
});

function TimerTick({
  activeId,
  startRef,
  children,
}: {
  activeId: string | null;
  startRef: MutableRefObject<number | null>;
  children: ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, []);
  const liveSecs = activeId && startRef.current
    ? Math.max(0, Math.floor((now - startRef.current) / 1000))
    : 0;
  const tickValue = useMemo(
    () => ({ now, liveSecs, fmtLive: fmtHms(liveSecs) }),
    [now, liveSecs],
  );
  return <TickContext.Provider value={tickValue}>{children}</TickContext.Provider>;
}

export function useTimer() {
  return useContext(TimerContext);
}

export function useTimerTick() {
  return useContext(TickContext);
}
