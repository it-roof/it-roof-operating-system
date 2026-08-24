export function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

export function requireString(value: unknown, field: string): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) throw new Error(`${field} erforderlich`);
  return s;
}

export function nowIso() {
  return new Date().toISOString();
}
