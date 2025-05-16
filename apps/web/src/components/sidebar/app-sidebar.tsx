import * as React from "react";

import { NavMain, NavMainProps } from "@/components/sidebar/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";

import { OrganizationSwitcher } from "./organization-switcher";

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
      <SidebarFooter className="pb-7 px-4">
        <OrganizationSwitcher />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
