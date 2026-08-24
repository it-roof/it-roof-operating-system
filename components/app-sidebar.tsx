'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAreaForPath, isLinkActive } from '@/lib/nav';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const path = usePathname();
  const area = getAreaForPath(path);

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="flex h-12 flex-row items-center border-b border-sidebar-border p-0 px-3">
        <Link href={area.href} className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-heading text-[10px] font-bold text-sidebar-primary-foreground">
            P
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-heading text-sm font-bold leading-none tracking-tight">
              Pinguine OS
            </p>
            <p className="mt-0.5 font-mono text-[10px] tracking-wide text-sidebar-foreground/50">
              / {area.label}
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-wide">
            {area.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {area.links.map((l) => (
                <SidebarMenuItem key={l.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isLinkActive(path, l.href)}
                    tooltip={l.label}
                    className="font-mono text-[12px] tracking-wide"
                  >
                    <Link href={l.href}>
                      <l.icon />
                      <span>{l.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
