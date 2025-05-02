import { AppSidebar } from "@/components/workflows-sidebar"
import * as sidebar from "@/components/ui/sidebar"
import { AppHeader } from "@/components/app-header"

export function DashboardPage() {
  return (
    <div className="flex flex-col bg-gray-100">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <sidebar.SidebarProvider>
          <AppSidebar />
          <sidebar.SidebarInset>
            <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
              <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-lg bg-gray-100" />
                <div className="aspect-video rounded-lg bg-gray-100" />
                <div className="aspect-video rounded-lg bg-gray-100" />
              </div>
            </div>
          </sidebar.SidebarInset>
        </sidebar.SidebarProvider>
      </div>
    </div>
  )
}
