/** Häufige Wegwerf-Domains — bewusst klein gehalten, bei Bedarf erweitern. */
export const DISPOSABLE_DOMAINS = new Set([
  '0-mail.com',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'mailinator.com',
  'mailinator.net',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'throwaway.email',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'sharklasers.com',
  'grr.la',
  'dispostable.com',
  'maildrop.cc',
  'fakeinbox.com',
  'moakt.com',
  'emailondeck.com',
  'mintemail.com',
  'mytemp.email',
  'tmpmail.org',
  'tmpmail.net',
]);

export function isDisposableDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  if (!d) return false;
  if (DISPOSABLE_DOMAINS.has(d)) return true;
  // Subdomains z.B. foo.mailinator.com
  for (const root of DISPOSABLE_DOMAINS) {
    if (d.endsWith(`.${root}`)) return true;
  }
  return false;
}
