import { Button } from '@/components/ui/button';
import { RefreshCwIcon, PlusIcon } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  onAdd?: () => void;
};

export function PageHeader({ title, subtitle, onRefresh, onAdd }: Props) {
  return (
    <div className="pt-8 pb-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCwIcon /> Neu laden
          </Button>
        )}
        {onAdd && (
          <Button size="icon" onClick={onAdd}>
            <PlusIcon />
          </Button>
        )}
      </div>
    </div>
  );
}
