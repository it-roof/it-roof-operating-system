'use client';

import { Button } from '@/components/ui/button';
import { SquareIcon } from 'lucide-react';
import { useTimer } from '@/lib/timer-context';

export function TimerBanner() {
  const { activeId, activeTitle, fmtLive, stopTask } = useTimer();

  if (!activeId || !activeTitle) return null;

  return (
    <div className="z-30 flex shrink-0 items-center gap-3 bg-foreground px-4 py-2.5 text-background">
      <span className="w-1.5 h-1.5 rounded-full bg-background/70 animate-pulse flex-shrink-0" />
      <span className="flex-1 text-sm font-medium truncate">{activeTitle}</span>
      <span className="text-sm font-mono font-bold tabular-nums">{fmtLive}</span>
      <Button
        size="sm" variant="outline" onClick={stopTask}
        className="flex-shrink-0 h-7 border-background/25 text-background bg-transparent hover:bg-background/10 hover:text-background hover:border-background/40"
      >
        <SquareIcon className="size-3" /> Stop
      </Button>
    </div>
  );
}
