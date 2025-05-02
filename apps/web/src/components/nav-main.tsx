"use client";

import { type LucideIcon, PanelLeft } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/utils/utils";
import { NavLink } from "./nav-link";

interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
}

export interface NavMainProps {
  title: string;
  items: NavMainItem[];
}

export function NavMain({ title, items }: NavMainProps) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <SidebarGroup className="bg-transparent">
      <SidebarMenu className="bg-transparent">
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={title}
            onClick={toggleSidebar}
            className="hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors mb-1"
          >
            <PanelLeft />
            <span
              className={cn(
                "uppercase text-semibold text-xs transition-opacity",
                open ? "opacity-100" : "opacity-0"
              )}
            >
              {title}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              className="hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
            >
              <NavLink
                to={item.url}
                activeClassName="[&>span]:!text-foreground bg-neutral-300/50 dark:bg-neutral-600/50 hover:bg-neutral-300/50 dark:hover:bg-neutral-600/50 focus:bg-neutral-300/50 dark:focus:bg-neutral-600/50 active:bg-neutral-300/50 dark:active:bg-neutral-600/50"
              >
                {item.icon && <item.icon />}
                <span
                  className={cn(
                    "text-sm transition-opacity text-neutral-600 dark:text-neutral-400",
                    open ? "opacity-100" : "opacity-0"
                  )}
                >
                  {item.title}
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
