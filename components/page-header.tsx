import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  onAdd?: () => void;
};

export function PageHeader({ title, subtitle, onAdd }: Props) {
  return (
    <div className="pt-8 pb-6 md:pt-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs font-mono text-muted-foreground mt-1 tracking-wide">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onAdd && (
          <Button
            size="icon"
            onClick={onAdd}
            className="rounded-full size-10"
          >
            <PlusIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
