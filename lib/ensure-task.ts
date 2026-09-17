import { type Task } from '@/lib/types';

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export async function ensureTask(
  title: string,
  projectId: string,
  tasks: Task[],
): Promise<string | null> {
  const trimmed = title.trim();
  if (!trimmed || !projectId) return null;

  const existing = tasks.find(
    t => t.project_id === projectId && t.title.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return existing.id;

  const r = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: trimmed,
      priority: 'medium',
      project_id: projectId,
      planned_date: todayIso(),
    }),
  });
  const data = await r.json();
  if (!r.ok || !data?.id) return null;
  return data.id as string;
}
