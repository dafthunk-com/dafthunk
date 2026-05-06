"use client";

import Check from "lucide-react/icons/check";
import ChevronsUpDown from "lucide-react/icons/chevrons-up-down";
import PlusCircle from "lucide-react/icons/plus-circle";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrganization,
  useOrganizations,
} from "@/services/organizations-service";

export function OrganizationSwitcher() {
  const { organization } = useAuth();
  const { organizations: orgList, mutateOrganizations } = useOrganizations();

  const navigate = useNavigate();
  const params = useParams<{ organizationId?: string }>();
  const currentOrgId = params.organizationId || organization?.id;
  const currentOrg =
    orgList?.find((org) => org.id === currentOrgId) || organization;
  const currentOrgName = currentOrg?.name || "Personal";
  const orgs = orgList || [];
  const isOrgScope = !!params.organizationId;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const handleCreateOrganization = useCallback(async (): Promise<void> => {
    const name = newOrgName.trim();
    if (!name) {
      toast.error("Organization name is required");
      return;
    }
    setIsProcessing(true);
    try {
      const response = await createOrganization({ name });
      const newOrg = response.organization;
      navigate(`/org/${newOrg.id}/workflows`);
      toast.success(
        "Organization created successfully and navigated to workflows"
      );
      setIsCreateDialogOpen(false);
      setNewOrgName("");
      await mutateOrganizations();
    } catch (error) {
      toast.error("Failed to create organization. Please try again.");
      console.error("Create Organization Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [newOrgName, mutateOrganizations, navigate]);

  return (
    <>
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
              navigate(`/org/${org.id}/dashboard`, { replace: true });
            };
            return (
              <DropdownMenuItem key={org.id} onClick={handleSwitch}>
                {org.name}
                {org.id === currentOrgId && (
                  <Check className="ml-auto size-4" />
                )}
              </DropdownMenuItem>
            );
          })}
          {orgs.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setIsCreateDialogOpen(true);
            }}
          >
            <PlusCircle className="mr-2 size-4" />
            Create
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) setNewOrgName("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new organization to manage your workflows and team
              members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-switcher-name">Organization Name</Label>
              <Input
                id="org-switcher-name"
                placeholder="My Company"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                disabled={isProcessing}
                maxLength={64}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewOrgName("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateOrganization}
              disabled={isProcessing || !newOrgName.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessing ? "Creating..." : "Create Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
