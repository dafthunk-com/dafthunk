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
  const params = useParams<{ handle?: string }>();
  const currentHandle = params.handle || organization?.handle;
  const currentOrg =
    orgList?.find((org) => org.handle === currentHandle) || organization;
  const currentOrgName = currentOrg?.name || "Personal";
  const orgs = orgList || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-2 text-sm font-medium bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50"
        >
          <span className="font-semibold">{currentOrgName}</span>
          <ChevronsUpDown className="ml-2 size-4 text-neutral-500 dark:text-neutral-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {orgs.map((org) => {
          const handleSwitch = () => {
            if (org.handle === currentHandle) return;
            let newPath = location.pathname;
            if (params.handle) {
              newPath = newPath.replace(
                `/org/${params.handle}`,
                `/org/${org.handle}`
              );
            } else {
              // No current :handle in URL (e.g., /settings/organizations): go to dashboard
              newPath = `/org/${org.handle}/dashboard`;
            }
            navigate(newPath, { replace: true });
          };
          return (
            <DropdownMenuItem key={org.id} onClick={handleSwitch}>
              {org.name}
              {org.handle === currentHandle && (
                <Check className="ml-auto size-4" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
