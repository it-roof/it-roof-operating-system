import { startOfWeek, endOfWeek, isSameMonth } from 'date-fns';

export type TimeEntry = {
  id: string;
  task_id: string;
  started_at: string;
  stopped_at: string | null;
  duration_seconds: number;
  title: string;
  projekt: string;
  firma: string;
  project_id: string;
  legacy?: boolean;
};

export type DayGroup = {
  date: string;
  label: string;
  total: number;
  entries: TimeEntry[];
};

export type WeekGroup = {
  key: string;
  label: string;
  total: number;
  days: DayGroup[];
};

const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function fmtHms(s: number) {
  const total = Math.max(0, Math.floor(s));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function fmtClock(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(h)}:${pad(m)}`;
}

export function localDateKey(isoOrDate: string | Date) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return dayKey(d);
}

export function parseClock(raw: string): { h: number; m: number } | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

export function parseHms(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s) * 60;
  const parts = s.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map(p => Number(p));
  if (nums.some(n => Number.isNaN(n) || n < 0)) return null;
  if (parts.length === 3) return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
  return nums[0]! * 3600 + nums[1]! * 60;
}

export function setLocalClock(iso: string, clock: { h: number; m: number }) {
  const d = new Date(iso);
  d.setHours(clock.h, clock.m, 0, 0);
  return d.toISOString();
}

export function applyEndClock(startIso: string, clock: { h: number; m: number }) {
  const end = setLocalClock(startIso, clock);
  if (new Date(end).getTime() <= new Date(startIso).getTime()) {
    return new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
  return end;
}

export function shiftToLocalDate(iso: string, ymd: string) {
  const d = new Date(iso);
  const [y, m, day] = ymd.split('-').map(Number);
  if (!y || !m || !day) return iso;
  d.setFullYear(y, m - 1, day);
  return d.toISOString();
}

export function addSeconds(iso: string, secs: number) {
  return new Date(new Date(iso).getTime() + secs * 1000).toISOString();
}

export function secondsBetween(startIso: string, endIso: string) {
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000));
}

export function combineLocal(ymd: string, clock: { h: number; m: number }) {
  const d = new Date();
  const [y, m, day] = ymd.split('-').map(Number);
  d.setFullYear(y!, (m ?? 1) - 1, day ?? 1);
  d.setHours(clock.h, clock.m, 0, 0);
  return d.toISOString();
}

export function entryDuration(entry: TimeEntry, now = Date.now()) {
  if (entry.stopped_at) return entry.duration_seconds;
  const start = new Date(entry.started_at).getTime();
  return Math.max(0, Math.floor((now - start) / 1000));
}

export function projectColor(id: string) {
  const palette = ['#2563eb', '#16a34a', '#111827', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length]!;
}

export function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date) {
  return `${DAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

function weekLabel(start: Date, end: Date) {
  if (isSameMonth(start, end)) {
    return `${start.getDate()}. – ${end.getDate()}. ${MONTHS[end.getMonth()]}`;
  }
  return `${start.getDate()}. ${MONTHS[start.getMonth()]} – ${end.getDate()}. ${MONTHS[end.getMonth()]}`;
}

export function groupTimeEntries(entries: TimeEntry[], now = Date.now()): WeekGroup[] {
  const weeks = new Map<string, WeekGroup>();

  function ensureWeek(d: Date): WeekGroup {
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    const key = dayKey(start);
    let week = weeks.get(key);
    if (!week) {
      week = { key, label: weekLabel(start, end), total: 0, days: [] };
      weeks.set(key, week);
    }
    return week;
  }

  function ensureDay(week: WeekGroup, d: Date): DayGroup {
    const date = dayKey(d);
    let day = week.days.find(x => x.date === date);
    if (!day) {
      day = { date, label: dayLabel(d), total: 0, entries: [] };
      week.days.push(day);
    }
    return day;
  }

  const today = new Date(now);
  ensureDay(ensureWeek(today), today);

  for (const entry of entries) {
    const d = new Date(entry.started_at);
    const week = ensureWeek(d);
    const day = ensureDay(week, d);
    const secs = entryDuration(entry, now);
    day.entries.push(entry);
    day.total += secs;
    week.total += secs;
  }

  for (const week of weeks.values()) {
    week.days.sort((a, b) => b.date.localeCompare(a.date));
  }

  return [...weeks.values()].sort((a, b) => b.key.localeCompare(a.key));
}
