import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  wide?: boolean;
};

export function PageContainer({ children, className, wide }: Props) {
  return (
    <div className={cn('h-full min-h-0 overflow-y-auto bg-background text-foreground', className)}>
      <div
        className={cn(
          'mx-auto px-4 pb-24 md:px-8 md:pb-10',
          wide ? 'max-w-xl md:max-w-6xl lg:max-w-7xl' : 'max-w-xl md:max-w-5xl',
        )}
      >
        {children}
      </div>
    </div>
  );
}
