import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Workflow } from "@dafthunk/types";
import { workflowService } from "@/services/workflowService";
import { useAuth } from "@/components/authContext.tsx";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "@/components/ui/data-table";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
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
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { CreateWorkflowDialog } from "@/components/workflow/create-workflow-dialog";

// --- Inline useWorkflowActions ---
function useWorkflowActions(refresh: () => void) {
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

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    setIsDeleting(true);
    try {
      await workflowService.delete(workflowToDelete.id);
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
      refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowToRename) return;
    setIsRenaming(true);
    try {
      const updatedWorkflow = { ...workflowToRename, name: renameWorkflowName };
      await workflowService.save(workflowToRename.id, updatedWorkflow);
      setRenameDialogOpen(false);
      setWorkflowToRename(null);
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
            onClick={handleDeleteWorkflow}
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
        <form onSubmit={handleRenameWorkflow} className="space-y-4">
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
  };
}

// --- Inline createColumns ---
function createColumns(
  openDeleteDialog: (workflow: Workflow) => void,
  openRenameDialog: (workflow: Workflow) => void,
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<Workflow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <div className="font-medium">{name || "Untitled Workflow"}</div>;
      },
    },
    {
      accessorKey: "id",
      header: "UUID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.id}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const workflow = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigate(`/workflows/playground/${workflow.id}`)}
              >
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openRenameDialog(workflow)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDeleteDialog(workflow)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function PlaygroundPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const fetchWorkflows = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    const fetchedWorkflows = await workflowService.getAll();
    setWorkflows(fetchedWorkflows);
    setTableKey((prev) => prev + 1);
  }, [isAuthenticated]);

  const { deleteDialog, renameDialog, openDeleteDialog, openRenameDialog } =
    useWorkflowActions(fetchWorkflows);

  const columns = createColumns(openDeleteDialog, openRenameDialog, navigate);

  useEffect(() => {
    if (!authLoading) {
      fetchWorkflows();
    }
  }, [isAuthenticated, authLoading, fetchWorkflows]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Playground" }]);
  }, [setBreadcrumbs]);

  const handleCreateWorkflow = async (name: string) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      const newWorkflow = await workflowService.create(name);
      setWorkflows((prev) => [...prev, newWorkflow]);
      setTableKey((prev) => prev + 1);
      navigate(`/workflows/playground/${newWorkflow.id}`);
    } catch {
      // Optionally show a toast here
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Workflows">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Create, manage, and run your workflows. Break it, fix it, prompt it,
            automatic.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            + Create Workflow
          </Button>
        </div>
        <DataTable
          key={tableKey}
          columns={columns}
          data={workflows}
          emptyState={{
            title: "No workflows found",
            description: "Create a new workflow to get started.",
          }}
        />
        {/* Create Workflow Dialog */}
        <CreateWorkflowDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreateWorkflow={handleCreateWorkflow}
        />
        {deleteDialog}
        {renameDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
