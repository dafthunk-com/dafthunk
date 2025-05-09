import { ReactNode } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import * as Sidebar from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { NavMainProps } from "@/components/sidebar/nav-main";
import { PageProvider } from "@/components/page-context";
import { Toaster } from "sonner";

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: {
    title: string;
    items: NavMainProps["items"];
    footerItems?: NavMainProps["footerItems"];
  };
}

export function AppLayout({ children, sidebar }: AppLayoutProps) {
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
                items={sidebar.items}
                footerItems={sidebar.footerItems}
              />
              <Sidebar.SidebarInset>
                <div className="h-full w-full overflow-y-auto">{children}</div>
              </Sidebar.SidebarInset>
            </Sidebar.SidebarProvider>
          ) : (
            <div className="relative flex w-full flex-1 flex-col border rounded-md mx-2 mb-2 bg-background overflow-auto">
              {children}
            </div>
          )}
        </div>
      </div>
    </PageProvider>
  );
}
