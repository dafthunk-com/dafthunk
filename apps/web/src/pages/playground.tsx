import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Workflow } from "@dafthunk/types";
import { workflowService } from "@/services/workflowService";
import { useAuth } from "@/components/authContext.tsx";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "@/components/ui/data-table";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus } from "lucide-react";
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
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(
    null
  );
  const [workflowToRename, setWorkflowToRename] = useState<Workflow | null>(
    null
  );
  const [workflowToDeploy, setWorkflowToDeploy] = useState<Workflow | null>(
    null
  );
  const [renameWorkflowName, setRenameWorkflowName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

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

  const handleDeployWorkflow = async () => {
    if (!workflowToDeploy) return;
    setIsDeploying(true);
    try {
      // TODO: Implement the actual deployment logic
      await workflowService.deploy(workflowToDeploy.id);
      setDeployDialogOpen(false);
      setWorkflowToDeploy(null);
    } finally {
      setIsDeploying(false);
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

  const deployDialog = (
    <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy Workflow</DialogTitle>
          <DialogDescription>
            Are you sure you want to deploy "
            {workflowToDeploy?.name || "Untitled Workflow"}"?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeployDialogOpen(false)}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button onClick={handleDeployWorkflow} disabled={isDeploying}>
            {isDeploying ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Deploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    deleteDialog,
    renameDialog,
    deployDialog,
    openDeleteDialog: (workflow: Workflow) => {
      setWorkflowToDelete(workflow);
      setDeleteDialogOpen(true);
    },
    openRenameDialog: (workflow: Workflow) => {
      setWorkflowToRename(workflow);
      setRenameWorkflowName(workflow.name || "");
      setRenameDialogOpen(true);
    },
    openDeployDialog: (workflow: Workflow) => {
      setWorkflowToDeploy(workflow);
      setDeployDialogOpen(true);
    },
    deployWorkflow: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Get current workflow from URL
      const path = window.location.pathname;
      const parts = path.split("/");
      const workflowId = parts[parts.length - 1];

      // Get workflow by ID and open deploy dialog
      workflowService.getById(workflowId).then((workflow) => {
        if (workflow) {
          setWorkflowToDeploy(workflow);
          setDeployDialogOpen(true);
        }
      });
    },
  };
}

// --- Inline createColumns ---
function createColumns(
  openDeleteDialog: (workflow: Workflow) => void,
  openRenameDialog: (workflow: Workflow) => void,
  openDeployDialog: (workflow: Workflow) => void,
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<Workflow>[] {
  return [
    {
      accessorKey: "name",
      header: "Workflow Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        const workflowId = row.original.id;
        return (
          <Link
            to={`/workflows/playground/${workflowId}`}
            className="hover:underline"
          >
            <div className="font-medium">{name || "Untitled Workflow"}</div>
          </Link>
        );
      },
    },
    {
      accessorKey: "id",
      header: "Workflow UUID",
      cell: ({ row }) => {
        const workflowId = row.original.id;
        return (
          <Link
            to={`/workflows/playground/${workflowId}`}
            className="font-mono text-xs hover:underline"
          >
            {workflowId}
          </Link>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const workflow = row.original;
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
                <DropdownMenuItem
                  onClick={() =>
                    navigate(`/workflows/playground/${workflow.id}`)
                  }
                >
                  Edit Workflow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openRenameDialog(workflow)}>
                  Rename Workflow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeployDialog(workflow)}>
                  Deploy Workflow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(workflow)}>
                  Delete Workflow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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

  const {
    deleteDialog,
    renameDialog,
    deployDialog,
    openDeleteDialog,
    openRenameDialog,
    openDeployDialog,
  } = useWorkflowActions(fetchWorkflows);

  const columns = createColumns(
    openDeleteDialog,
    openRenameDialog,
    openDeployDialog,
    navigate
  );

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
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
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
        {deployDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
