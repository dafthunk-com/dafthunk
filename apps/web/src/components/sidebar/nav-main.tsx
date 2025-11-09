"use client";

import { type LucideIcon, PanelLeftClose } from "lucide-react";
import PanelLeftOpen from "lucide-react/icons/panel-left-open";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
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

interface NavMainGroup {
  label?: string;
  items: NavMainItem[];
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
  groups: NavMainGroup[];
  footerItems?: NavMainItem[];
}

export function NavMain({ groups, footerItems }: NavMainProps) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <div className="flex-1 flex flex-col justify-between py-2 pb-0">
      <div className="flex flex-col gap-2 px-4">
        {groups.map((group, index) => (
          <SidebarGroup key={group.label || index} className="bg-transparent p-0">
            {group.label && (
              <SidebarGroupLabel className="text-xs text-neutral-500 dark:text-neutral-400 px-2">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu className="bg-transparent">
              {group.items.map((item) => (
                <NavMainItem key={item.title} item={item} open={open} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </div>
      <SidebarGroup className="bg-transparent p-0">
        <SidebarMenu className="bg-transparent px-4">
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
              {open ? <PanelLeftClose /> : <PanelLeftOpen />}
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
    </div>
  );
}
