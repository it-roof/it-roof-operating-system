'use client';

import { useTimer } from '@/lib/timer-context';
import { type Task } from '@/lib/types';

type SetTasks = React.Dispatch<React.SetStateAction<Task[]>>;

export function useTaskMutations(setTasks: SetTasks) {
  const { activeId, finishTask, updateActiveTitle } = useTimer();

  async function doneTask(id: string) {
    const totalSecs = await finishTask(id);
    const body: Record<string, unknown> = { status: 'done' };
    if (totalSecs > 30) body.time_estimate_minutes = Math.max(1, Math.round(totalSecs / 60));
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setTasks(ts => ts.filter(t => t.id !== id));
  }

  async function deleteTask(id: string) {
    if (activeId === id) await finishTask(id);
    const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!r.ok) return;
    setTasks(ts => ts.filter(t => t.id !== id));
  }

  async function saveTitle(id: string, newTitle: string) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    setTasks(ts => ts.map(t => t.id === id ? { ...t, title: newTitle } : t));
    if (activeId === id) updateActiveTitle(newTitle);
  }

  return { doneTask, deleteTask, saveTitle };
}
