'use client';

import { Button } from '@/components/ui/button';
import { SquareIcon } from 'lucide-react';
import { useTimer } from '@/lib/timer-context';

export function TimerBanner() {
  const { activeId, activeTitle, fmtLive, stopTask } = useTimer();

  if (!activeId || !activeTitle) return null;

  return (
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
      <span className="flex-1 text-sm font-medium truncate">{activeTitle}</span>
      <span className="text-base font-bold tabular-nums">{fmtLive}</span>
      <Button
        size="xs"
        variant="outline"
        onClick={stopTask}
        className="flex-shrink-0 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
      >
        <SquareIcon /> Stop
      </Button>
    </div>
  );
}
