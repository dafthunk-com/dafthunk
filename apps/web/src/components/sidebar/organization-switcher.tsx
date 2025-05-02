"use client";

import { Check, ChevronsUpDown, Building } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";

export function OrganizationSwitcher() {
  const currentOrganization = "Personal";
  const organizations = ["Personal"];

  const { open } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-neutral-200/50 dark:data-[state=open]:bg-neutral-700/50"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-neutral-300 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300">
                <Building className="size-4" />
              </div>
              {open && (
                <>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{currentOrganization}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-neutral-500 dark:text-neutral-400" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width]"
            align="start"
          >
            {organizations.map((org) => (
              <DropdownMenuItem key={org}>
                {org}
                {org === currentOrganization && (
                  <Check className="ml-auto size-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
