import * as React from "react";

import { NavMain, NavMainProps } from "@/components/sidebar/nav-main";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & NavMainProps;

export function AppSidebar({
  title,
  items,
  footerItems,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="flex-1 border-none sticky overflow-x-hidden"
      {...props}
    >
      <SidebarContent className="h-full">
        <NavMain title={title} items={items} footerItems={footerItems} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
