"use client";

import { Check, ChevronsUpDown } from "lucide-react";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OrganizationSwitcher() {
  const { organization } = useAuth();

  const currentOrganization = organization?.name || "Personal";

  const organizations = [currentOrganization];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-2 text-sm font-medium hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
        >
          <span className="font-semibold">{currentOrganization}</span>
          <ChevronsUpDown className="ml-2 size-4 text-neutral-500 dark:text-neutral-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
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
  );
}
