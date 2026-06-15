'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fmtSec } from '@/lib/task-utils';

const STORAGE_KEY = 'cherry-os-accumulated';

function loadAccumulated(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function persistAccumulated(acc: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acc));
}

type TimerContextType = {
  activeId: string | null;
  activeTitle: string | null;
  /** Live-Sekunden der gerade laufenden Aufgabe (akkumuliert + aktuell) */
  liveSecs: number;
  fmtLive: string;
  /** Gesamte akkumulierte Sekunden für eine beliebige Aufgabe */
  getTaskSecs: (id: string) => number;
  startTask: (id: string, title: string) => void;
  stopTask: () => void;
  /** Schließt die Zeiterfassung ab: gibt Gesamtsekunden zurück und löscht den Eintrag */
  finishTask: (id: string) => number;
};

const TimerContext = createContext<TimerContextType>({
  activeId: null,
  activeTitle: null,
  liveSecs: 0,
  fmtLive: '00:00',
  getTaskSecs: () => 0,
  startTask: () => {},
  stopTask: () => {},
  finishTask: () => 0,
});

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [accumulated, setAccumulated] = useState<Record<string, number>>({});
  const startRef = useRef<number | null>(null);
  const [tick, setTick] = useState(0);

  // localStorage beim ersten Render laden
  useEffect(() => {
    setAccumulated(loadAccumulated());
  }, []);

  // 500ms Tick für Live-Anzeige
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

  const liveSecs = activeId ? getTaskSecs(activeId) : 0;

  function startTask(id: string, title: string) {
    // Laufenden Timer zuerst pausieren falls eine andere Aufgabe aktiv ist
    if (activeId && activeId !== id) {
      const running = Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000);
      const updated = { ...accumulated, [activeId]: (accumulated[activeId] ?? 0) + running };
      setAccumulated(updated);
      persistAccumulated(updated);
    }
    setActiveId(id);
    setActiveTitle(title);
    startRef.current = Date.now();
  }

  function stopTask() {
    if (!activeId || !startRef.current) return;
    const running = Math.floor((Date.now() - startRef.current) / 1000);
    const updated = { ...accumulated, [activeId]: (accumulated[activeId] ?? 0) + running };
    setAccumulated(updated);
    persistAccumulated(updated);
    startRef.current = null;
    setActiveId(null);
    setActiveTitle(null);
  }

  function finishTask(id: string): number {
    // Gesamtzeit berechnen (inkl. laufender Session)
    const total = getTaskSecs(id);

    // Laufende Session stoppen falls diese Aufgabe aktiv ist
    if (activeId === id) {
      startRef.current = null;
      setActiveId(null);
      setActiveTitle(null);
    }

    // Aus accumulated entfernen
    const updated = { ...accumulated };
    delete updated[id];
    setAccumulated(updated);
    persistAccumulated(updated);

    return total;
  }

  // tick wird für den Render genutzt
  void tick;

  return (
    <TimerContext.Provider value={{
      activeId,
      activeTitle,
      liveSecs,
      fmtLive: fmtSec(liveSecs),
      getTaskSecs,
      startTask,
      stopTask,
      finishTask,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}
