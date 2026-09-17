export const OUTREACH_STATUSES = [
  'open',
  'valid',
  'invalid',
  'domain_dead',
  'skip',
  'bounced',
] as const;

export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const OUTREACH_STATUS_DE: Record<OutreachStatus, string> = {
  open: 'Offen',
  valid: 'Valid',
  invalid: 'Invalid',
  domain_dead: 'Domain tot',
  skip: 'Skip',
  bounced: 'Bounce',
};

export const OUTREACH_STATUS_CLASS: Record<OutreachStatus, string> = {
  open: 'text-muted-foreground',
  valid: 'text-success',
  invalid: 'text-danger',
  domain_dead: 'text-warning',
  skip: 'text-muted-foreground',
  bounced: 'text-danger',
};

/** Nur diese dürfen in den Versand */
export const OUTREACH_SENDABLE: readonly OutreachStatus[] = ['valid'];

export function isOutreachStatus(value: string): value is OutreachStatus {
  return (OUTREACH_STATUSES as readonly string[]).includes(value);
}

export function parseOutreachStatus(value: unknown, fallback: OutreachStatus = 'open'): OutreachStatus {
  const v = String(value ?? '').trim();
  return isOutreachStatus(v) ? v : fallback;
}

export function formatOutreachStatusAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}
