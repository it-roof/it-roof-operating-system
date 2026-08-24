'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OS_AREAS, getAreaForPath } from '@/lib/nav';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  areaSwitchItemClassName,
  areaSwitchTrackClassName,
  chromeSurface,
} from '@/lib/nav-chrome';
import { cn } from '@/lib/utils';

export function AppNavbar() {
  const path = usePathname();
  if (path.startsWith('/ai/')) return null;

  const area = getAreaForPath(path);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b px-3 md:px-4',
        chromeSurface,
      )}
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-sidebar-foreground" />
        <Separator orientation="vertical" className="mr-1 hidden h-4 bg-sidebar-border sm:block" />
      </div>

      <nav className={cn(areaSwitchTrackClassName())}>
        {OS_AREAS.map((a) => {
          const active = a.id === area.id;
          return (
            <Link
              key={a.id}
              href={a.href}
              className={areaSwitchItemClassName(active)}
            >
              <a.icon className="size-3.5" strokeWidth={active ? 2.5 : 1.75} />
              <span className="font-mono tracking-wide">{a.label}</span>
            </Link>
          );
        })}
      </nav>

      <div aria-hidden="true" />
    </header>
  );
}
