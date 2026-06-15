'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CalendarDaysIcon, ListTodoIcon, UsersIcon, FolderIcon } from 'lucide-react';

const links = [
  { href: '/', label: 'Heute', icon: CalendarDaysIcon },
  { href: '/aufgaben', label: 'Aufgaben', icon: ListTodoIcon },
  { href: '/kunden', label: 'Kunden', icon: UsersIcon },
  { href: '/projekte', label: 'Projekte', icon: FolderIcon },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur border-t border-border">
      <div className="max-w-xl mx-auto flex items-center justify-around px-4 py-2">
        {links.map(l => {
          const active = l.href === '/' ? path === '/' : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors
                ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <l.icon className="size-5" strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] font-semibold tracking-wide">{l.label}</span>
              {active && <span className="w-1 h-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
