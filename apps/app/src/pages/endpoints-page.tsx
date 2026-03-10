import type { EndpointMode } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import Pencil from "lucide-react/icons/pencil";
import PlusCircle from "lucide-react/icons/plus-circle";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EndpointCreateDialog } from "@/components/workflow/widgets/input/endpoint-create-dialog";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  deleteEndpoint,
  updateEndpoint,
  useEndpoints,
} from "@/services/endpoint-service";

interface EndpointRow {
  id: string;
  name: string;
  handle: string;
  mode: EndpointMode;
  createdAt: Date;
  updatedAt: Date;
}

function createColumns(
  openEditDialog: (endpoint: EndpointRow) => void,
  openDeleteDialog: (endpoint: EndpointRow) => void
): ColumnDef<EndpointRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Endpoint Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <span className="font-medium">{name || "Untitled Endpoint"}</span>
        );
      },
    },
    {
      accessorKey: "handle",
      header: "Handle",
      cell: ({ row }) => {
        const handle = row.original.handle;
        return <span className="text-sm text-muted-foreground">{handle}</span>;
      },
    },
    {
      accessorKey: "mode",
      header: "Mode",
      cell: ({ row }) => {
        const mode = row.original.mode;
        return (
          <span className="text-sm text-muted-foreground capitalize">
            {mode}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const endpoint = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(endpoint)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(endpoint)}>
                  Delete Endpoint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function EndpointsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [endpointToDelete, setEndpointToDelete] = useState<EndpointRow | null>(
    null
  );
  const [endpointToEdit, setEndpointToEdit] = useState<EndpointRow | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editMode, setEditMode] = useState<EndpointMode>("webhook");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { endpoints, endpointsError, isEndpointsLoading, mutateEndpoints } =
    useEndpoints();

  useEffect(() => {
    setBreadcrumbs([{ label: "Endpoints" }]);
  }, [setBreadcrumbs]);

  const openDeleteDialog = (endpoint: EndpointRow) => {
    setEndpointToDelete(endpoint);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (endpoint: EndpointRow) => {
    setEndpointToEdit(endpoint);
    setEditName(endpoint.name);
    setEditMode(endpoint.mode);
    setEditDialogOpen(true);
  };

  const handleDeleteEndpoint = async () => {
    if (!endpointToDelete || !orgHandle) return;
    setIsDeleting(true);
    try {
      await deleteEndpoint(endpointToDelete.id, orgHandle);
      setDeleteDialogOpen(false);
      setEndpointToDelete(null);
      mutateEndpoints();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditEndpoint = async () => {
    if (!endpointToEdit || !orgHandle || editName.trim() === "") return;
    setIsEditing(true);
    try {
      await updateEndpoint(
        endpointToEdit.id,
        { name: editName.trim(), mode: editMode },
        orgHandle
      );
      setEditDialogOpen(false);
      setEndpointToEdit(null);
      mutateEndpoints();
    } finally {
      setIsEditing(false);
    }
  };

  const handleCreated = () => {
    mutateEndpoints();
    setIsCreateDialogOpen(false);
  };

  const columns = createColumns(openEditDialog, openDeleteDialog);

  if (isEndpointsLoading) {
    return <InsetLoading title="Endpoints" />;
  } else if (endpointsError) {
    return (
      <InsetError title="Endpoints" errorMessage={endpointsError.message} />
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Endpoints">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Create and manage HTTP endpoints for your workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Endpoint
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={(endpoints as EndpointRow[]) || []}
          emptyState={{
            title: "No endpoints found",
            description: "Create a new HTTP endpoint to get started.",
          }}
        />
        <EndpointCreateDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onCreated={handleCreated}
        />
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Endpoint</DialogTitle>
              <DialogDescription>
                Update your endpoint settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="edit-endpoint-name">Name</Label>
                <Input
                  id="edit-endpoint-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endpoint-mode">Mode</Label>
                <Select
                  value={editMode}
                  onValueChange={(v) => setEditMode(v as EndpointMode)}
                >
                  <SelectTrigger id="edit-endpoint-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="request">Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditEndpoint}
                disabled={isEditing || editName.trim() === ""}
              >
                {isEditing ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Endpoint</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "
                {endpointToDelete?.name || "Untitled Endpoint"}"? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteEndpoint}
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </InsetLayout>
    </TooltipProvider>
  );
}
