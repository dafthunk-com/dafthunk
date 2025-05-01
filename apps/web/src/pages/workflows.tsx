import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Workflow } from "@dafthunk/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { workflowService } from "@/services/workflowService";
import { useAuth } from "@/components/authContext.tsx";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "@/components/workflows/data-table";
import { columns } from "@/components/workflows/columns";

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);
  const [workflowToRename, setWorkflowToRename] = useState<Workflow | null>(null);
  const [renameWorkflowName, setRenameWorkflowName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const fetchedWorkflows = await workflowService.getAll();
        setWorkflows(fetchedWorkflows);
      } catch (error) {
        console.error("Error fetching workflows:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (!authLoading) {
      fetchWorkflows();
    }
  }, [isAuthenticated, authLoading]);

  const handleCreateWorkflow = async (name: string) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      const newWorkflow = await workflowService.create(name);
      setWorkflows([...workflows, newWorkflow]);
      navigate(`/workflows/${newWorkflow.id}`);
    } catch (error) {
      console.error("Error creating workflow:", error);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    setIsDeleting(true);
    try {
      await workflowService.delete(workflowToDelete.id);
      setWorkflows(workflows.filter((w) => w.id !== workflowToDelete.id));
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    } catch (error) {
      console.error("Error deleting workflow:", error);
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
      setWorkflows(
        workflows.map((w) =>
          w.id === workflowToRename.id ? { ...w, name: renameWorkflowName } : w
        )
      );
      setRenameDialogOpen(false);
      setWorkflowToRename(null);
    } catch (error) {
      console.error("Error renaming workflow:", error);
    } finally {
      setIsRenaming(false);
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Spinner className="h-8 w-8" />
        <p className="text-gray-500 mt-4">Loading workflows...</p>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <img src="/logo.svg" alt="Dafthunk Logo" className="h-32 mb-8" />
        <h1 className="text-2xl font-bold">Workflows no one asked for</h1>
        <p className="text-gray-500 text-lg mt-2 mb-14">
          Break it, fix it, prompt it, automatic, automatic, ...
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <main className="h-full">
        <div className="h-full overflow-hidden">
          <div className="relative h-full overflow-auto">
            <div className="p-6">
              <div className="flex flex-col gap-1.5 mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
                <p className="text-muted-foreground">
                  Create, manage, and run your workflows. Break it, fix it, prompt it, automatic.
                </p>
              </div>
              <DataTable
                columns={columns}
                data={workflows}
                onDelete={(workflow) => {
                  setWorkflowToDelete(workflow);
                  setDeleteDialogOpen(true);
                }}
                onRename={(workflow) => {
                  setWorkflowToRename(workflow);
                  setRenameWorkflowName(workflow.name || "");
                  setRenameDialogOpen(true);
                }}
                onCreateWorkflow={handleCreateWorkflow}
              />
            </div>
          </div>
        </div>
        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Workflow</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "
                {workflowToDelete?.name || "Untitled Workflow"}"? This action
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
                onClick={handleDeleteWorkflow}
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Edit workflow dialog */}
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
      </main>
    </TooltipProvider>
  );
}