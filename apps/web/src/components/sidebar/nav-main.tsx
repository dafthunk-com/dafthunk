"use client";

import { type LucideIcon } from "lucide-react";
import PanelLeft from "lucide-react/icons/panel-left";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/utils/utils";

import { NavLink } from "../nav-link";

interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
}

function NavMainItem({ item, open }: { item: NavMainItem; open: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        className="hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
      >
        <NavLink
          to={item.url}
          className="whitespace-nowrap"
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
  );
}

export interface NavMainProps {
  title: string;
  items: NavMainItem[];
  footerItems?: NavMainItem[];
}

export function NavMain({ items, footerItems }: NavMainProps) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <SidebarGroup className="bg-transparent justify-between flex-1 py-2 px-4 pt-4 pb-0">
      <SidebarMenu className="bg-transparent">
        {items.map((item) => (
          <NavMainItem key={item.title} item={item} open={open} />
        ))}
      </SidebarMenu>
      <SidebarMenu className="bg-transparent">
        {footerItems &&
          footerItems.map((item) => (
            <NavMainItem key={item.title} item={item} open={open} />
          ))}
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Toggle sidebar"
            onClick={toggleSidebar}
            className="hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors mt-1 mb-5"
          >
            <PanelLeft />
            <span
              className={cn(
                "uppercase text-semibold text-xs transition-opacity",
                open ? "opacity-100" : "opacity-0"
              )}
            >
              Collapse
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
