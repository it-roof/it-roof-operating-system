export function normalizeMessageId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().replace(/^<|>$/g, '').trim();
  return t || null;
}

export function threadIdFromHeaders(
  messageId: string | null | undefined,
  inReplyTo: string | null | undefined,
  referencesHeader: string | null | undefined,
): string {
  const refs = (referencesHeader ?? '')
    .split(/\s+/)
    .map(s => normalizeMessageId(s))
    .filter((s): s is string => Boolean(s));
  return refs[0] || normalizeMessageId(inReplyTo) || normalizeMessageId(messageId) || crypto.randomUUID();
}

export function parseAddressList(raw: string | null | undefined): { name: string | null; address: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { name?: string | null; address?: string }[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(a => typeof a?.address === 'string' && a.address)
      .map(a => ({ name: a.name ?? null, address: a.address! }));
  } catch {
    return [];
  }
}

export function stringifyAddressList(list: { name?: string | null; address?: string | null }[] | undefined) {
  if (!list?.length) return null;
  const rows = list
    .filter(a => a.address)
    .map(a => ({ name: a.name ?? null, address: a.address!.trim() }));
  return rows.length ? JSON.stringify(rows) : null;
}

export function snippetFrom(text: string | null | undefined, html: string | null | undefined) {
  const src = (text ?? '').trim() || (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return src.slice(0, 180) || null;
}
