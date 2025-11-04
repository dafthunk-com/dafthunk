import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import Plus from "lucide-react/icons/plus";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createOrganization,
  deleteOrganization,
  useMemberships,
  useOrganizations,
} from "@/services/organizations-service";

function ActionsCell({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const { user } = useAuth();
  const { memberships } = useMemberships(organizationId);

  const isOwner = memberships.some(
    (m) => m.userId === user?.sub && m.role === "owner"
  );

  if (!isOwner) {
    return null;
  }

  return (
    <div className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent("deleteOrganizationTrigger", {
                  detail: {
                    id: organizationId,
                    name: organizationName,
                  },
                })
              )
            }
            className="text-red-600 focus:text-red-600"
          >
            Delete Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function OrganizationsPage() {
  const {
    organizations,
    organizationsError,
    isOrganizationsLoading,
    mutateOrganizations,
  } = useOrganizations();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [orgToDelete, setOrgToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const columns: ColumnDef<{
    id: string;
    name: string;
    handle: string;
    createdAt: Date;
    updatedAt: Date;
  }>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "handle",
      header: "Handle",
      cell: ({ row }) => <div>{row.getValue("handle")}</div>,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date;
        return <div>{format(date, "MMM d, yyyy")}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <ActionsCell
          organizationId={row.original.id}
          organizationName={row.original.name}
        />
      ),
    },
  ];

  const handleCreateOrganization = useCallback(async (): Promise<void> => {
    if (!newOrgName.trim()) {
      toast.error("Organization name is required");
      return;
    }
    setIsProcessing(true);
    try {
      const response = await createOrganization({
        name: newOrgName.trim(),
      });
      const newOrg = response.organization;
      navigate(`/org/${newOrg.handle}/workflows`);
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

  const handleDeleteOrganization = useCallback(async (): Promise<void> => {
    if (!orgToDelete) return;
    setIsProcessing(true);
    try {
      await deleteOrganization(orgToDelete.id);
      toast.success("Organization deleted successfully");
      setIsDeleteDialogOpen(false);
      setOrgToDelete(null);
      await mutateOrganizations();
    } catch (error) {
      toast.error("Failed to delete organization. Please try again.");
      console.error("Delete Organization Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [orgToDelete, mutateOrganizations]);

  // Handle delete events from the table
  const handleDeleteEvent = useCallback((e: Event) => {
    const custom = e as CustomEvent<{ id: string; name: string }>;
    if (custom.detail) {
      setOrgToDelete(custom.detail);
      setIsDeleteDialogOpen(true);
    }
  }, []);

  // Add event listener for delete events
  useEffect(() => {
    document.addEventListener("deleteOrganizationTrigger", handleDeleteEvent);
    return () =>
      document.removeEventListener(
        "deleteOrganizationTrigger",
        handleDeleteEvent
      );
  }, [handleDeleteEvent]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Organizations" }]);
  }, [setBreadcrumbs]);

  if (isOrganizationsLoading && !organizations) {
    return <InsetLoading title="Organizations" />;
  } else if (organizationsError) {
    return (
      <InsetError
        title="Organizations"
        errorMessage={organizationsError.message}
      />
    );
  }

  return (
    <InsetLayout title="Organizations">
      <div className="flex items-center justify-between mb-6 min-h-10">
        <div className="text-sm text-muted-foreground max-w-2xl">
          Manage your organizations and workspaces.
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={organizations || []}
        emptyState={{
          title: "No organizations found",
          description: "Create your first organization to get started.",
        }}
      />

      {/* Create Organization Dialog */}
      <AlertDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new organization to manage your workflows and team
              members. A unique handle will be automatically generated from the
              organization name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                placeholder="My Company"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                disabled={isProcessing}
                maxLength={64}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setNewOrgName("");
              }}
            >
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

      {/* Delete Organization Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              organization <strong>"{orgToDelete?.name}"</strong> and all of its
              data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All workflows and deployments</li>
                <li>All executions and results</li>
                <li>All API keys and secrets</li>
                <li>All datasets</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action is irreversible and will permanently delete all
              organization data.
            </AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrgToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Deleting..." : "Delete Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </InsetLayout>
  );
}
