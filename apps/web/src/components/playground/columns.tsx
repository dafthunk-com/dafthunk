import { ColumnDef } from "@tanstack/react-table";
import { Workflow } from "@dafthunk/types";
import { Button } from "@/components/ui/button";
import {
  PencilIcon,
  Trash2Icon,
  ArrowUpDown,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { workflowService } from "@/services/workflowService";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const useWorkflowActions = () => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(
    null
  );
  const [workflowToRename, setWorkflowToRename] = useState<Workflow | null>(
    null
  );
  const [renameWorkflowName, setRenameWorkflowName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleDeleteWorkflow = async (
    onDeleteSuccess?: (id: string) => void
  ) => {
    if (!workflowToDelete) return;
    setIsDeleting(true);
    try {
      await workflowService.delete(workflowToDelete.id);
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
      if (onDeleteSuccess) {
        onDeleteSuccess(workflowToDelete.id);
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameWorkflow = async (
    e: React.FormEvent,
    onRenameSuccess?: (workflow: Workflow) => void
  ) => {
    e.preventDefault();
    if (!workflowToRename) return;
    setIsRenaming(true);
    try {
      const updatedWorkflow = { ...workflowToRename, name: renameWorkflowName };
      await workflowService.save(workflowToRename.id, updatedWorkflow);
      setRenameDialogOpen(false);
      setWorkflowToRename(null);
      if (onRenameSuccess) {
        onRenameSuccess(updatedWorkflow);
      }
    } catch (error) {
      console.error("Error renaming workflow:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Workflow</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "
            {workflowToDelete?.name || "Untitled Workflow"}"? This action cannot
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
            onClick={() => handleDeleteWorkflow()}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renameDialog = (
    <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => handleRenameWorkflow(e)} className="space-y-4">
          <div>
            <Label htmlFor="rename-name">Workflow Name</Label>
            <Input
              id="rename-name"
              value={renameWorkflowName}
              onChange={(e) => setRenameWorkflowName(e.target.value)}
              placeholder="Enter workflow name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isRenaming}>
              {isRenaming ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return {
    deleteDialog,
    renameDialog,
    openDeleteDialog: (workflow: Workflow) => {
      setWorkflowToDelete(workflow);
      setDeleteDialogOpen(true);
    },
    openRenameDialog: (workflow: Workflow) => {
      setWorkflowToRename(workflow);
      setRenameWorkflowName(workflow.name || "");
      setRenameDialogOpen(true);
    },
    handleDeleteWorkflow,
    handleRenameWorkflow,
  };
};

export const createColumns = (
  openDeleteDialog: (workflow: Workflow) => void,
  openRenameDialog: (workflow: Workflow) => void
): ColumnDef<Workflow>[] => [
  {
    accessorKey: "id",
    header: "UUID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.id}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      return <div className="font-medium">{name || "Untitled Workflow"}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const workflow = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openRenameDialog(workflow);
              }}
            >
              <PencilIcon className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openDeleteDialog(workflow);
              }}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2Icon className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// For backward compatibility
export const columns = createColumns(
  () => {},
  () => {}
);
