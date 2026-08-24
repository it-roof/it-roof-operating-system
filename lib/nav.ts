import {
  CalendarDaysIcon,
  ListTodoIcon,
  UsersIcon,
  FolderIcon,
  SparklesIcon,
  ClapperboardIcon,
  CrosshairIcon,
  ContactIcon,
  MegaphoneIcon,
  ListOrderedIcon,
  Link2Icon,
  SearchIcon,
  type LucideIcon,
} from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type OsArea = {
  id: 'aufgaben' | 'studio' | 'leads';
  label: string;
  icon: LucideIcon;
  /** Landing when switching into this area */
  href: string;
  /** Path prefixes that belong to this area */
  match: string[];
  links: NavLink[];
};

export const OS_AREAS: OsArea[] = [
  {
    id: 'aufgaben',
    label: 'Aufgaben',
    icon: ListTodoIcon,
    href: '/',
    match: ['/', '/aufgaben', '/kunden', '/projekte'],
    links: [
      { href: '/', label: 'Heute', icon: CalendarDaysIcon },
      { href: '/aufgaben', label: 'Aufgaben', icon: ListTodoIcon },
      { href: '/kunden', label: 'Kunden', icon: UsersIcon },
      { href: '/projekte', label: 'Projekte', icon: FolderIcon },
    ],
  },
  {
    id: 'studio',
    label: 'Studio',
    icon: ClapperboardIcon,
    href: '/studio',
    match: ['/studio', '/ai'],
    links: [
      { href: '/studio', label: 'Studio', icon: ClapperboardIcon },
      { href: '/ai', label: 'AI', icon: SparklesIcon },
    ],
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: CrosshairIcon,
    href: '/leads',
    match: ['/leads'],
    links: [
      { href: '/leads', label: 'Leads', icon: CrosshairIcon },
      { href: '/leads/kontakte', label: 'Kontakte', icon: ContactIcon },
      { href: '/leads/kampagnen', label: 'Kampagnen', icon: MegaphoneIcon },
      { href: '/leads/steps', label: 'Steps', icon: ListOrderedIcon },
      { href: '/leads/zuordnungen', label: 'Zuordnungen', icon: Link2Icon },
      { href: '/leads/suchen', label: 'Suchen', icon: SearchIcon },
    ],
  },
];

/** @deprecated use getAreaForPath / OS_AREAS — kept for any leftover imports */
export const NAV_LINKS: NavLink[] = OS_AREAS.flatMap((a) => a.links);

export function getAreaForPath(path: string): OsArea {
  const scored = OS_AREAS.map((area) => {
    const hit = area.match.find((m) =>
      m === '/' ? path === '/' : path === m || path.startsWith(`${m}/`),
    );
    return { area, score: hit ? hit.length : -1 };
  }).sort((a, b) => b.score - a.score);

  return scored[0]!.score >= 0 ? scored[0]!.area : OS_AREAS[0]!;
}

export function isLinkActive(path: string, href: string) {
  if (href === '/') return path === '/';
  if (path === href) return true;
  // Detail-Routen unter einem Sidebar-Punkt (z. B. /ai/[id])
  if (href === '/ai' && path.startsWith('/ai/')) return true;
  return false;
}
