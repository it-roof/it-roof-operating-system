'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TimerBanner } from '@/components/timer-banner';
import { AppSidebar } from '@/components/app-sidebar';
import { AppNavbar } from '@/components/app-navbar';
import Navbar from '@/components/navbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh min-h-svh overflow-hidden bg-background">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden bg-background">
          <AppNavbar />
          <TimerBanner />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
          <Navbar />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
