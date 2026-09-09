/** Mehrfach-Filter aus Query-Params (city=a&city=b oder city=a,b) */
export function parseListParam(
  params: URLSearchParams,
  keys: string[],
): string[] {
  const out: string[] = [];
  for (const key of keys) {
    for (const raw of params.getAll(key)) {
      for (const part of raw.split(',')) {
        const v = part.trim();
        if (v) out.push(v);
      }
    }
  }
  return [...new Set(out)];
}

export function appendListParams(
  params: URLSearchParams,
  key: string,
  values: string[],
) {
  for (const v of values) {
    if (v.trim()) params.append(key, v.trim());
  }
}

export function parseListBody(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean),
    )];
  }
  if (typeof value === 'string' && value.trim()) {
    return [...new Set(
      value.split(',').map((v) => v.trim()).filter(Boolean),
    )];
  }
  return [];
}
