"use client";

import Check from "lucide-react/icons/check";
import ChevronsUpDown from "lucide-react/icons/chevrons-up-down";
import { useLocation, useNavigate, useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrganizations } from "@/services/organizations-service";

export function OrganizationSwitcher() {
  const { organization } = useAuth();
  const { organizations: orgList } = useOrganizations();

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ organizationId?: string }>();
  const currentOrgId = params.organizationId || organization?.id;
  const currentOrg =
    orgList?.find((org) => org.id === currentOrgId) || organization;
  const currentOrgName = currentOrg?.name || "Personal";
  const orgs = orgList || [];
  const isOrgScope = location.pathname.startsWith("/org/");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          data-tour="organization-switcher"
          className={`h-8 px-2 text-sm font-medium ${
            isOrgScope
              ? "bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50"
              : ""
          }`}
        >
          <span className="font-semibold">{currentOrgName}</span>
          <ChevronsUpDown className="ml-2 size-4 text-neutral-500 dark:text-neutral-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {orgs.map((org) => {
          const handleSwitch = () => {
            if (org.id === currentOrgId) return;
            let newPath = location.pathname;
            if (params.organizationId) {
              newPath = newPath.replace(
                `/org/${params.organizationId}`,
                `/org/${org.id}`
              );
            } else {
              // No current :organizationId in URL (e.g., /settings/organizations): go to dashboard
              newPath = `/org/${org.id}/dashboard`;
            }
            navigate(newPath, { replace: true });
          };
          return (
            <DropdownMenuItem key={org.id} onClick={handleSwitch}>
              {org.name}
              {org.id === currentOrgId && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
