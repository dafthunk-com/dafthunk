import { ReactNode } from "react";
import { AppSidebar } from "@/components/workflows-sidebar";
import * as Sidebar from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { NavMainProps } from "@/components/nav-main";

interface LayoutProps {
  children: ReactNode;
  sidebar?: {
    title: string;
    items: NavMainProps["items"];
  };
}

export function Layout({ children, sidebar }: LayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col">
      <AppHeader />
      <div className="flex flex-1">
        {sidebar ? (
          <Sidebar.SidebarProvider>
            <AppSidebar title={sidebar.title} items={sidebar.items} />
            <Sidebar.SidebarInset>{children}</Sidebar.SidebarInset>
          </Sidebar.SidebarProvider>
        ) : (
          <div className="relative flex w-full flex-1 flex-col border border-gray-200 rounded-md mx-2 mb-2 bg-background overflow-hidden">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
