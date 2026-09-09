import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { pagePadBottom, pagePadX } from '@/lib/page-layout';

type Props = {
  children: ReactNode;
  className?: string;
  /**
   * Inhaltsbreite begrenzen (Opt-in).
   * - `true` / `"md"` → bisheriger Standard
   * - `"lg"` → bisheriges `wide`
   * Ohne Angabe: volle Content-Breite.
   */
  contained?: boolean | 'md' | 'lg';
  /** @deprecated Nutze `contained` — Default ist bereits volle Breite */
  wide?: boolean;
  /** @deprecated Default ist bereits volle Breite */
  full?: boolean;
  /** Füllt die Viewport-Höhe und scrollt intern (Split-Layouts) */
  fill?: boolean;
};

export function PageContainer({
  children,
  className,
  contained,
  wide,
  full: _full,
  fill,
}: Props) {
  const width = contained === true || contained === 'md'
    ? 'md'
    : contained === 'lg' || wide
      ? 'lg'
      : 'full';

  return (
    <div
      className={cn(
        'bg-background text-foreground',
        fill ? 'flex h-full min-h-0 flex-col overflow-hidden' : 'h-full min-h-0 overflow-y-auto',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto w-full',
          fill && width === 'full'
            ? 'flex min-h-0 flex-1 flex-col px-0 pb-0'
            : fill
              ? cn('flex min-h-0 flex-1 flex-col', pagePadX, 'pb-4 md:pb-6')
              : cn(pagePadX, pagePadBottom),
          width === 'full'
            ? 'max-w-none'
            : width === 'lg'
              ? 'max-w-xl md:max-w-6xl lg:max-w-7xl'
              : 'max-w-xl md:max-w-5xl',
        )}
      >
        {children}
      </div>
    </div>
  );
}
