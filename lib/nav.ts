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
  Link2Icon,
  SearchIcon,
  LayoutDashboardIcon,
  InboxIcon,
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
    href: '/leads/dashboard',
    match: ['/leads'],
    links: [
      { href: '/leads/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
      { href: '/leads/inbox', label: 'Inbox', icon: InboxIcon },
      { href: '/leads', label: 'Leads', icon: CrosshairIcon },
      { href: '/leads/kontakte', label: 'Kontakte', icon: ContactIcon },
      { href: '/leads/kampagnen', label: 'Kampagnen', icon: MegaphoneIcon },
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

export type BreadcrumbCrumb = {
  label: string;
  href?: string;
};

function titleFromSegment(seg: string) {
  const decoded = decodeURIComponent(seg);
  if (decoded.length <= 2) return decoded.toUpperCase();
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

/** Best matching nav link for a path (longest href wins). */
function getLinkForPath(path: string, area: OsArea = getAreaForPath(path)) {
  return [...area.links]
    .sort((a, b) => b.href.length - a.href.length)
    .find((l) => {
      if (l.href === '/') return path === '/';
      return path === l.href || path.startsWith(`${l.href}/`);
    }) ?? null;
}

/** Breadcrumbs for the top navbar: Area › Page › … */
export function getBreadcrumbsForPath(path: string): BreadcrumbCrumb[] {
  const area = getAreaForPath(path);
  const link = getLinkForPath(path, area);

  if (!link) {
    const segs = path.split('/').filter(Boolean);
    if (segs.length === 0) return [{ label: area.label }];
    return [
      { href: area.href, label: area.label },
      ...segs.slice(0, -1).map((s, i) => ({
        href: `/${segs.slice(0, i + 1).join('/')}`,
        label: titleFromSegment(s),
      })),
      { label: titleFromSegment(segs[segs.length - 1]!) },
    ];
  }

  // Genau der Nav-Link
  if (path === link.href) {
    if (link.href === area.href && link.label === area.label) {
      return [{ label: area.label }];
    }
    return [
      { href: area.href, label: area.label },
      { label: link.label },
    ];
  }

  // Tiefer unter dem Link (z. B. /leads/dashboard unter /leads)
  const rest = path
    .slice(link.href === '/' ? 0 : link.href.length)
    .split('/')
    .filter(Boolean);

  const crumbs: BreadcrumbCrumb[] = [
    { href: area.href, label: area.label },
  ];

  if (!(link.href === area.href && link.label === area.label)) {
    crumbs.push({ href: link.href, label: link.label });
  }

  for (let i = 0; i < rest.length; i++) {
    const isLast = i === rest.length - 1;
    const href = `${link.href === '/' ? '' : link.href}/${rest.slice(0, i + 1).join('/')}`;
    crumbs.push(
      isLast
        ? { label: titleFromSegment(rest[i]!) }
        : { href, label: titleFromSegment(rest[i]!) },
    );
  }

  const last = crumbs[crumbs.length - 1];
  if (last?.href) {
    crumbs[crumbs.length - 1] = { label: last.label };
  }

  return crumbs;
}
