import * as React from "react"
import {
  Target,
  Logs,
  SquareTerminal,
  Play,
  Bot,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
            >
              <a href="#">
                <Bot className="h-5 w-5" />
                <span className="text-sm font-semibold">dafthunk</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
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
