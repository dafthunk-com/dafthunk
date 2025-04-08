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

  const handleLoginClick = async (provider: "github" | "google") => {
    await login(provider);
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
          <div className="flex flex-col space-y-4 w-full max-w-xs">
            <Button 
              onClick={() => handleLoginClick("github")} 
              className="w-full flex items-center justify-center"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </Button>
            <Button 
              onClick={() => handleLoginClick("google")} 
              className="w-full flex items-center justify-center"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
          </div>
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
