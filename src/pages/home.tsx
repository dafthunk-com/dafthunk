import { Button } from "@/components/ui/button";
import { PlusIcon, Trash2Icon, PencilIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Workflow } from "@/lib/server/api/apiTypes";
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

export function HomePage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);
  const [workflowToEdit, setWorkflowToEdit] = useState<Workflow | null>(null);
  const [editWorkflowName, setEditWorkflowName] = useState("");
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
      setWorkflows(workflows.filter(w => w.id !== workflowToDelete.id));
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

  const openEditDialog = (e: React.MouseEvent, workflow: Workflow) => {
    e.preventDefault();
    e.stopPropagation();
    setWorkflowToEdit(workflow);
    setEditWorkflowName(workflow.name || "");
    setEditDialogOpen(true);
  };

  const handleEditWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workflowToEdit) return;
    
    setIsEditing(true);
    try {
      const updatedWorkflow = { ...workflowToEdit, name: editWorkflowName };
      const result = await workflowService.save(workflowToEdit.id, updatedWorkflow);
      
      // Update the workflow in the list
      setWorkflows(workflows.map(w => 
        w.id === workflowToEdit.id ? { ...w, name: editWorkflowName } : w
      ));
      
      setEditDialogOpen(false);
      setWorkflowToEdit(null);
    } catch (error) {
      console.error("Error updating workflow:", error);
    } finally {
      setIsEditing(false);
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
          <h1 className="text-2xl font-bold">Workflow Editor</h1>
          <p className="text-gray-500 text-lg mt-2 mb-6">
            Sign in to create and manage your workflows
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
          <h1 className="text-2xl font-bold">Workflow Editor</h1>
          <p className="text-gray-500 text-lg mt-2">
            No workflows yet. Create your first one!
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
                <button
                  onClick={(e) => openEditDialog(e, workflow)}
                  className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                  aria-label="Edit workflow"
                >
                  <PencilIcon className="w-5 h-5 text-blue-500" />
                </button>
                <button
                  onClick={(e) => openDeleteDialog(e, workflow)}
                  className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                  aria-label="Delete workflow"
                >
                  <Trash2Icon className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
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
              Are you sure you want to delete "{workflowToDelete?.name || 'Untitled Workflow'}"? 
              This action cannot be undone.
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditWorkflow} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Workflow Name</Label>
              <Input
                id="edit-name"
                value={editWorkflowName}
                onChange={(e) => setEditWorkflowName(e.target.value)}
                placeholder="Enter workflow name"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button"
                onClick={() => setEditDialogOpen(false)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isEditing}
              >
                {isEditing ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
