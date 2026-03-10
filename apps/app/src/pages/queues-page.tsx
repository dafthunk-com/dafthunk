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
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueueCreateDialog } from "@/components/workflow/widgets/input/queue-create-dialog";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { deleteQueue, updateQueue, useQueues } from "@/services/queue-service";

interface QueueRow {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

function createColumns(
  openEditDialog: (queue: QueueRow) => void,
  openDeleteDialog: (queue: QueueRow) => void
): ColumnDef<QueueRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Queue Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <span className="font-medium">{name || "Untitled Queue"}</span>;
      },
    },
    {
      accessorKey: "handle",
      header: "Queue Handle",
      cell: ({ row }) => {
        const handle = row.original.handle;
        return <span className="text-sm text-muted-foreground">{handle}</span>;
      },
    },
    {
      id: "prodEndpoint",
      header: "Production Endpoint",
      cell: ({ row }) => {
        const queue = row.original;
        const endpoint = `/api/queues/${queue.handle}/publish`;
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {endpoint}
          </span>
        );
      },
    },
    {
      id: "devEndpoint",
      header: "Development Endpoint",
      cell: ({ row }) => {
        const queue = row.original;
        const endpoint = `/api/queues/${queue.handle}/publish/dev`;
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {endpoint}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const queue = row.original;
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
                <DropdownMenuItem onClick={() => openEditDialog(queue)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(queue)}>
                  Delete Queue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function QueuesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [queueToDelete, setQueueToDelete] = useState<QueueRow | null>(null);
  const [queueToEdit, setQueueToEdit] = useState<QueueRow | null>(null);
  const [editName, setEditName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { queues, queuesError, isQueuesLoading, mutateQueues } = useQueues();

  useEffect(() => {
    setBreadcrumbs([{ label: "Queues" }]);
  }, [setBreadcrumbs]);

  const openDeleteDialog = (queue: QueueRow) => {
    setQueueToDelete(queue);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (queue: QueueRow) => {
    setQueueToEdit(queue);
    setEditName(queue.name);
    setEditDialogOpen(true);
  };

  const handleDeleteQueue = async () => {
    if (!queueToDelete || !orgHandle) return;
    setIsDeleting(true);
    try {
      await deleteQueue(queueToDelete.id, orgHandle);
      setDeleteDialogOpen(false);
      setQueueToDelete(null);
      mutateQueues();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditQueue = async () => {
    if (!queueToEdit || !orgHandle || editName.trim() === "") return;
    setIsEditing(true);
    try {
      await updateQueue(queueToEdit.id, { name: editName.trim() }, orgHandle);
      setEditDialogOpen(false);
      setQueueToEdit(null);
      mutateQueues();
    } finally {
      setIsEditing(false);
    }
  };

  const handleCreated = () => {
    mutateQueues();
    setIsCreateDialogOpen(false);
  };

  const columns = createColumns(openEditDialog, openDeleteDialog);

  if (isQueuesLoading) {
    return <InsetLoading title="Queues" />;
  } else if (queuesError) {
    return <InsetError title="Queues" errorMessage={queuesError.message} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Queues">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Create and manage message queues for your workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Queue
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={(queues as QueueRow[]) || []}
          emptyState={{
            title: "No queues found",
            description: "Create a new queue to get started.",
          }}
        />
        <QueueCreateDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onCreated={handleCreated}
        />
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Queue</DialogTitle>
              <DialogDescription>Rename your queue.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="edit-queue-name">Name</Label>
              <Input
                id="edit-queue-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
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
                onClick={handleEditQueue}
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
              <DialogTitle>Delete Queue</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "
                {queueToDelete?.name || "Untitled Queue"}"? This action cannot
                be undone.
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
                onClick={handleDeleteQueue}
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
