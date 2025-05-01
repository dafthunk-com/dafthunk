import { AppSidebar } from "@/components/app-sidebar"
import { UserProfile } from "@/components/user-profile"
import { Link } from "react-router-dom"
import * as sidebar from "@/components/ui/sidebar"

export function DashboardPage() {
  return (
    <sidebar.SidebarProvider>
      <AppSidebar />
      <sidebar.SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-end gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6">
              <Link to="/workflows" className="text-sm">Workflows</Link>
              <Link to="/docs" className="text-sm">Docs</Link>
            </nav>
            <UserProfile />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
        </div>
      </sidebar.SidebarInset>
    </sidebar.SidebarProvider>
  )
}
