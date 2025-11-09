import { ReactNode } from "react";
import { Toaster } from "sonner";

import { AppHeader } from "@/components/app-header";
import { PageProvider } from "@/components/page-context";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { NavMainProps } from "@/components/sidebar/nav-main";
import * as Sidebar from "@/components/ui/sidebar";
import { cn } from "@/utils/utils";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
  sidebar?: {
    title: string;
    groups: NavMainProps["groups"];
    footerItems?: NavMainProps["footerItems"];
  };
}

export function AppLayout({ children, sidebar, className }: AppLayoutProps) {
  return (
    <PageProvider>
      <div className="flex h-screen w-screen overflow-hidden flex-col">
        <AppHeader />
        <Toaster />
        <div className="flex flex-1 overflow-hidden">
          {sidebar ? (
            <Sidebar.SidebarProvider>
              <AppSidebar
                title={sidebar.title}
                groups={sidebar.groups}
                footerItems={sidebar.footerItems}
              />
              <Sidebar.SidebarInset>
                <div className="h-full w-full overflow-y-auto">{children}</div>
              </Sidebar.SidebarInset>
            </Sidebar.SidebarProvider>
          ) : (
            <div
              className={cn(
                "relative flex w-full flex-1 flex-col border rounded-md mx-2 mb-2 bg-background overflow-auto",
                className
              )}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </PageProvider>
  );
}
