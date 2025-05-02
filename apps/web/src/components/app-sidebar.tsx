import * as React from "react";

import { NavMain, NavMainProps } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & NavMainProps;

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
