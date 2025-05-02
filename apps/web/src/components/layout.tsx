import { ReactNode } from "react";
import { AppSidebar, AppSidebarItem } from "@/components/workflows-sidebar";
import * as sidebar from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";

interface LayoutProps {
  children: ReactNode;
  sidebarTitle?: string;
  sidebarItems?: AppSidebarItem[];
}

export function Layout({ children, sidebarTitle, sidebarItems }: LayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <sidebar.SidebarProvider>
          <AppSidebar title={sidebarTitle ?? ""} items={sidebarItems ?? []} />
          <sidebar.SidebarInset>{children}</sidebar.SidebarInset>
        </sidebar.SidebarProvider>
      </div>
    </div>
  );
}
