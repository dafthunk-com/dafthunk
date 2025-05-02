import * as React from "react"
import {
  Target,
  Logs,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Playground",
      url: "/workflows/playground",
      icon: SquareTerminal,
    },
    {
      title: "Deployments",
      url: "/workflows/deployments",
      icon: Target,
    },
    {
      title: "Executions",
      url: "/workflows/executions",
      icon: Logs,
    },
  ],
}


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  return (
    <Sidebar collapsible="icon" className="h-full mt-12 border-none" {...props}>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {/* Footer content */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
