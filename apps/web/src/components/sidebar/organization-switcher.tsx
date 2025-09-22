"use client";

import { Check, ChevronsUpDown, Settings } from "lucide-react";
import { useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OrganizationSwitcher() {
  const { organization } = useAuth();
  const navigate = useNavigate();

  // Use organization name from auth context, fallback to "Personal" if not available
  const currentOrganization = organization?.name || "Personal";

  // For now, we just have one organization, but we'll keep the dropdown
  // In the future, this could fetch all available organizations for the user
  const organizations = [currentOrganization];

  const handleAdministrationClick = () => {
    navigate("/organizations");
  };

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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAdministrationClick}>
          <Settings className="mr-2 size-4" />
          Administration
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
