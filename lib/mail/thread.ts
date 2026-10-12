export function normalizeMessageId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().replace(/^<|>$/g, '').trim();
  return t || null;
}

export function formatMessageId(raw: string | null | undefined): string | null {
  const n = normalizeMessageId(raw);
  return n ? `<${n}>` : null;
}

export function messageIdVariants(raw: string | null | undefined): string[] {
  const n = normalizeMessageId(raw);
  if (!n) return [];
  return [`<${n}>`, n];
}

export function messageIdFromRaw(raw: Buffer): string | null {
  const header = raw.subarray(0, 16_384).toString('utf8').split(/\r?\n\r?\n/, 1)[0] ?? '';
  const unfolded = header.replace(/\r?\n[ \t]/g, ' ');
  const m = unfolded.match(/^message-id:\s*(.+)$/im);
  return formatMessageId(m?.[1] ?? null);
}

export function parseAddressField(raw: unknown): { name: string | null; address: string }[] {
  if (Array.isArray(raw)) {
    return raw.flatMap(item => {
      if (typeof item === 'string') return parseAddressField(item);
      if (item && typeof item === 'object' && typeof (item as { address?: string }).address === 'string') {
        const address = (item as { address: string }).address.trim();
        const name = (item as { name?: string | null }).name ?? null;
        return address.includes('@') ? [{ name, address }] : [];
      }
      return [];
    });
  }
  if (typeof raw !== 'string' || !raw.trim()) return [];

  const parts: string[] = [];
  let buf = '';
  let depth = 0;
  let quote = false;
  for (const ch of raw) {
    if (ch === '"' && depth === 0) {
      quote = !quote;
      buf += ch;
      continue;
    }
    if (!quote && ch === '<') depth += 1;
    if (!quote && ch === '>' && depth) depth -= 1;
    if (!quote && depth === 0 && (ch === ',' || ch === ';')) {
      if (buf.trim()) parts.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());

  const out: { name: string | null; address: string }[] = [];
  for (const part of parts) {
    const angled = part.match(/^(?:"([^"]*)"|([^<]*?))?\s*<([^>]+)>$/);
    if (angled) {
      const address = angled[3]!.trim();
      const name = (angled[1] ?? angled[2] ?? '').trim() || null;
      if (address.includes('@')) out.push({ name, address });
      continue;
    }
    const email = part.replace(/^<|>$/g, '').trim();
    if (email.includes('@')) out.push({ name: null, address: email });
  }
  return out;
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
