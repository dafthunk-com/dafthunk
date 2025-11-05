import { ColumnDef } from "@tanstack/react-table";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import Plus from "lucide-react/icons/plus";
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
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { createQueue, deleteQueue, useQueues } from "@/services/queue-service";

function useQueueActions() {
  const { mutateQueues } = useQueues();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [queueToDelete, setQueueToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Queue</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "
            {queueToDelete?.name || "Untitled Queue"}"? This action cannot be
            undone.
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
  );

  return {
    deleteDialog,
    openDeleteDialog: (queue: any) => {
      setQueueToDelete(queue);
      setDeleteDialogOpen(true);
    },
  };
}

function createColumns(
  openDeleteDialog: (queue: any) => void
): ColumnDef<any>[] {
  return [
    {
      accessorKey: "name",
      header: "Queue Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <div className="font-medium">{name || "Untitled Queue"}</div>;
      },
    },
    {
      accessorKey: "handle",
      header: "Queue Handle",
      cell: ({ row }) => {
        const handle = row.original.handle;
        return <div className="font-mono text-xs">{handle}</div>;
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
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { queues, queuesError, isQueuesLoading, mutateQueues } = useQueues();

  const { deleteDialog, openDeleteDialog } = useQueueActions();

  const columns = createColumns(openDeleteDialog);

  useEffect(() => {
    setBreadcrumbs([{ label: "Queues" }]);
  }, [setBreadcrumbs]);

  const handleCreateQueue = async (name: string) => {
    if (!orgHandle) return;

    try {
      await createQueue({ name }, orgHandle);
      mutateQueues();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Failed to create queue:", error);
    }
  };

  if (isQueuesLoading) {
    return <InsetLoading title="Queues" />;
  } else if (queuesError) {
    return <InsetError title="Queues" errorMessage={queuesError.message} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Queues">
        <div className="flex items-center justify-between mb-6  min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Create and manage message queues for your workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Queue
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={queues || []}
          emptyState={{
            title: "No queues found",
            description: "Create a new queue to get started.",
          }}
        />
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Queue</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get("name") as string;
                await handleCreateQueue(name);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Queue Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter queue name"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Queue</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {deleteDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
