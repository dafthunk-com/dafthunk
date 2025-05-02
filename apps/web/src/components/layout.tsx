import { ReactNode } from "react";
import { AppSidebar } from "@/components/workflows-sidebar"
import * as sidebar from "@/components/ui/sidebar"
import { AppHeader } from "@/components/app-header"

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <sidebar.SidebarProvider>
          <AppSidebar />
          <sidebar.SidebarInset>
            {children}
          </sidebar.SidebarInset>
        </sidebar.SidebarProvider>
      </div>
    </div>
  )
}

