import { Button } from "@/components/ui/button";
import { PlusIcon, Trash2Icon, PencilIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Workflow } from "@/lib/server/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { workflowService } from "@/services/workflowService";
import { useAuth } from "@/lib/auth/authContext";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function HomePage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(
    null
  );
  const [workflowToRename, setWorkflowToRename] = useState<Workflow | null>(
    null
  );
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [renameWorkflowName, setRenameWorkflowName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
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

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const newWorkflow = await workflowService.create(newWorkflowName);
      setWorkflows([...workflows, newWorkflow]);
      setNewWorkflowName("");
      setOpen(false);
      navigate(`/workflow/${newWorkflow.id}`);
    } catch (error) {
      console.error("Error creating workflow:", error);
    }
  };

  const handleLoginClick = async () => {
    await login("github");
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

  const openDeleteDialog = (e: React.MouseEvent, workflow: Workflow) => {
    e.preventDefault();
    e.stopPropagation();
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
  };

  const openRenameDialog = (e: React.MouseEvent, workflow: Workflow) => {
    e.preventDefault();
    e.stopPropagation();
    setWorkflowToRename(workflow);
    setRenameWorkflowName(workflow.name || "");
    setRenameDialogOpen(true);
  };

  const handleRenameWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workflowToRename) return;

    setIsRenaming(true);
    try {
      const updatedWorkflow = { ...workflowToRename, name: renameWorkflowName };
      await workflowService.save(workflowToRename.id, updatedWorkflow);

      // Update the workflow in the list
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

  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Spinner className="h-8 w-8" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <img
            src="/logo.svg"
            alt="Dafthunk – Short for Dope as F*** Thunk."
            className="h-32 mb-8"
          />
          <h1 className="text-2xl font-bold">
            <Link
              target="_blank"
              to="https://www.youtube.com/watch?v=K0HSD_i2DvA"
            >
              Workflows No One Asked For
            </Link>
          </h1>
          <p className="text-gray-500 text-lg mt-2 mb-14">
            <Link
              target="_blank"
              to="https://www.youtube.com/watch?v=D8K90hX4PrE"
            >
              Break it, fix it, prompt it, automatic, automatic, ...
            </Link>
          </p>
          <Button onClick={handleLoginClick} className="px-6">
            Sign in with GitHub
          </Button>
        </div>
      );
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
          <img
            src="/logo.svg"
            alt="Dafthunk – Short for Dope as F*** Thunk."
            className="h-32 mb-8"
          />
          <h1 className="text-2xl font-bold">
            <Link
              target="_blank"
              to="https://www.youtube.com/watch?v=K0HSD_i2DvA"
            >
              Workflows No One Asked For
            </Link>
          </h1>
          <p className="text-gray-500 text-lg mt-2 mb-14">
            <Link
              target="_blank"
              to="https://www.youtube.com/watch?v=D8K90hX4PrE"
            >
              Break it, fix it, prompt it, automatic, automatic, ...
            </Link>
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow) => (
          <Link key={workflow.id} to={`/workflow/${workflow.id}`}>
            <div className="p-4 rounded-lg border-2 bg-white hover:border-blue-500 transition-colors cursor-pointer relative group">
              <h3 className="font-medium text-lg truncate">
                {workflow.name || "Untitled Workflow"}
              </h3>
              <div className="absolute top-1/2 right-2 -translate-y-1/2 flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => openRenameDialog(e, workflow)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded bg-gray-100 text-blue-500 hover:bg-gray-200"
                      aria-label="Rename workflow"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Rename</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => openDeleteDialog(e, workflow)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded bg-gray-100 text-red-500 hover:bg-gray-200"
                      aria-label="Delete workflow"
                    >
                      <Trash2Icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <main className="h-full">
        <div className="h-full rounded-xl border border-white overflow-hidden bg-gray-100">
          <div className="relative h-full p-6 overflow-auto">
            {renderContent()}

            {isAuthenticated && (
              <div className="absolute bottom-4 right-4">
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-full shadow-lg h-10 w-10 p-0">
                      <PlusIcon className="w-6 h-6" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Workflow</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateWorkflow} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Workflow Name</Label>
                        <Input
                          id="name"
                          value={newWorkflowName}
                          onChange={(e) => setNewWorkflowName(e.target.value)}
                          placeholder="Enter workflow name"
                          className="mt-2"
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Create Workflow
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
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
