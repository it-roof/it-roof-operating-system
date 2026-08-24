export const PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export function parsePage(value: string | null): number {
  const n = Number(value ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function parseLimit(value: string | null, fallback: PageSize = PAGE_SIZE): PageSize {
  const n = Number(value ?? fallback);
  if (PAGE_SIZE_OPTIONS.includes(n as PageSize)) return n as PageSize;
  return fallback;
}

export function pageOffset(page: number, limit: number) {
  return (page - 1) * limit;
}

export function pageMeta(total: number, page: number, limit: number) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  return {
    page: safePage,
    limit,
    total,
    pages,
    returned: Math.min(limit, Math.max(0, total - pageOffset(safePage, limit))),
  };
}
