'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAGE_SIZE, PAGE_SIZE_OPTIONS, type PageSize } from '@/lib/leads/pagination';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

type Props = {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: PageSize) => void;
};

export function ListPagination({ page, pages, total, limit, onPageChange, onLimitChange }: Props) {
  if (total <= PAGE_SIZE && pages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
          {from}–{to} von {total}
        </p>
        {onLimitChange && (
          <Select
            value={String(limit)}
            onValueChange={(v) => onLimitChange(parseInt(v, 10) as PageSize)}
          >
            <SelectTrigger className="h-7 w-[5.5rem] font-mono text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="font-mono text-xs">
                  {n}/Seite
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <span className="min-w-[4.5rem] text-center font-mono text-[11px] tabular-nums text-muted-foreground">
            {page}/{pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
