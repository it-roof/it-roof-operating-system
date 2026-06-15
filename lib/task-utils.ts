export const PRIO_DE: Record<string, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' };

export function fmtSec(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = sec < 10 ? `0${sec}` : `${sec}`;
  return h > 0 ? `${h < 10 ? '0' + h : h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtMin(min: number | null) {
  if (!min) return '';
  if (min < 60) return `${min} Min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
