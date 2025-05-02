"use client";

import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({
  title,
  items,
}: {
  title: string;
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
  }[];
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <SidebarGroup className="bg-transparent">
      <SidebarMenu className="bg-transparent">
        <SidebarMenuItem>
          <div className="text-sm mx-2 mb-2 font-bold">{title}</div>
        </SidebarMenuItem>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              className="hover:bg-gray-200 transition-colors"
            >
              <a href={item.url}>
                {item.icon && <item.icon />}
                <span className="text-sm">{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
