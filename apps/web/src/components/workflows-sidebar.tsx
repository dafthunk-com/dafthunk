import * as React from "react";
import { LucideIcon } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";

export interface AppSidebarItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  title: string;
  items: AppSidebarItem[];
}

export function AppSidebar({ title, items, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" className="h-full mt-12 border-none" {...props}>
      <SidebarContent>
        <NavMain items={items} title={title} />
      </SidebarContent>
      <SidebarFooter>{/* Footer content */}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
