"use client"

import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "./ui/button"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
  }[]
}) {

  const { toggleSidebar } = useSidebar()


  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem key="collapse">
          <SidebarMenuButton onClick={toggleSidebar}>
            <SidebarTrigger className="h-4 w-4" />
            <span className="text-sm">Workflows</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <a href={item.url}>
                {item.icon && <item.icon />}
                <span className="text-sm">{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
