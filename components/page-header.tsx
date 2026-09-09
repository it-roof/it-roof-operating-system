import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, PlusIcon } from 'lucide-react';
import { pageHeaderY } from '@/lib/page-layout';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onAdd?: () => void;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, onBack, onAdd, actions, className }: Props) {
  return (
    <div className={cn('flex items-start justify-between gap-3', pageHeaderY, className)}>
      <div className="min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Zurück
          </button>
        )}
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {actions}
        {onAdd && (
          <Button
            size="icon"
            onClick={onAdd}
            className="size-10 rounded-full"
          >
            <PlusIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
