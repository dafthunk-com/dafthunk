"use client";

import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/utils/utils";

interface DocsSubsection {
  title: string;
  href: string;
}

export interface DocsSection {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  subsections?: DocsSubsection[];
}

interface DocsNavMainProps {
  sections: DocsSection[];
}

export function DocsNavMain({ sections }: DocsNavMainProps) {
  const location = useLocation();

  return (
    <SidebarGroup className="px-4 py-2">
      <SidebarMenu className="bg-transparent">
        {sections.map((section) => {
          const isActive = location.pathname === section.href;
          const showSubsections = isActive && section.subsections;

          return (
            <SidebarMenuItem key={section.href}>
              <SidebarMenuButton
                asChild
                tooltip={section.title}
                className="hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
              >
                <Link
                  to={section.href}
                  className={cn(
                    "whitespace-nowrap",
                    isActive &&
                      "bg-neutral-300/50 dark:bg-neutral-600/50 hover:bg-neutral-300/50 dark:hover:bg-neutral-600/50"
                  )}
                >
                  <section.icon className="size-4" />
                  <span
                    className={cn(
                      "text-sm text-neutral-600 dark:text-neutral-400",
                      isActive && "!text-foreground font-medium"
                    )}
                  >
                    {section.title}
                  </span>
                </Link>
              </SidebarMenuButton>

              {showSubsections && (
                <SidebarMenuSub className="border-l-0">
                  {section.subsections!.map((subsection) => (
                    <SidebarMenuSubItem key={subsection.href}>
                      <SidebarMenuSubButton asChild size="sm">
                        <a
                          href={subsection.href}
                          className="text-neutral-600 dark:text-neutral-400 hover:text-foreground"
                        >
                          {subsection.title}
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
