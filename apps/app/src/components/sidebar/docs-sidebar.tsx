"use client";

import type * as React from "react";

import type { DocsSection } from "@/components/sidebar/docs-nav-main";
import { DocsNavMain } from "@/components/sidebar/docs-nav-main";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";

interface DocsSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sections: DocsSection[];
}

export function DocsSidebar({ sections, ...props }: DocsSidebarProps) {
  return (
    <Sidebar
      collapsible="none"
      className="border-none sticky overflow-x-hidden"
      {...props}
    >
      <SidebarContent className="h-full">
        <DocsNavMain sections={sections} />
      </SidebarContent>
    </Sidebar>
  );
}
