import { Button } from "@/components/ui/button";
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
import { DataTable } from "@/components/ui/data-table";
import { createColumns, useWorkflowActions } from "@/components/playground/columns";
import { CreateWorkflowDialog } from "@/components/playground/create-workflow-dialog";
import { InsetLayout } from "@/components/layouts/inset-layout";

export function PlaygroundPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const {
    deleteDialog,
    renameDialog,
    openDeleteDialog,
    openRenameDialog,
    handleDeleteWorkflow,
    handleRenameWorkflow,
  } = useWorkflowActions();
  
  // Create columns with our action handlers
  const columns = createColumns(openDeleteDialog, openRenameDialog);

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
      navigate(`/workflows/playground/${newWorkflow.id}`);
    } catch (error) {
      console.error("Error creating workflow:", error);
    }
  };

  // Set up success handlers for delete and rename
  useEffect(() => {
    const onDeleteSuccess = (id: string) => {
      setWorkflows(workflows.filter((w) => w.id !== id));
    };
    
    const onRenameSuccess = (updatedWorkflow: Workflow) => {
      setWorkflows(
        workflows.map((w) =>
          w.id === updatedWorkflow.id ? updatedWorkflow : w
        )
      );
    };
    
    // We're just setting up callbacks here, not actually binding them
    // The handlers will be called with these callbacks from the dialog actions
  }, [workflows]);

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
        <p className="text-neutral-500 mt-4">Loading workflows...</p>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <img
          src="/logo.svg"
          alt="Dafthunk Logo"
          className="h-32 mb-8 dark:invert"
        />
        <h1 className="text-2xl font-bold">Workflows no one asked for</h1>
        <p className="text-neutral-500 text-lg mt-2 mb-7">
          Break it, fix it, prompt it, automatic, automatic, ...
        </p>
        <CreateWorkflowDialog onCreateWorkflow={handleCreateWorkflow} />
      </div>
    );
  }

  const toolbarContent = (
    <>
      <Input
        placeholder="Filter workflows..."
        className="max-w-sm"
      />
      <CreateWorkflowDialog 
        onCreateWorkflow={handleCreateWorkflow}
        buttonProps={{
          size: "sm",
        }}
      />
    </>
  );

  return (
    <TooltipProvider>
      <InsetLayout title="Workflows">
        <p className="text-muted-foreground">
          Create, manage, and run your workflows. Break it, fix it, prompt it,
          automatic.
        </p>
        <DataTable
          columns={columns}
          data={workflows}
          isLoading={isLoading}
          enableSorting={true}
          enableFiltering={true}
          enablePagination={true}
          enableRowSelection={false}
          emptyState={{
            title: "No workflows found",
            description: "Create a new workflow to get started",
          }}
          toolbar={toolbarContent}
        />
        {deleteDialog}
        {renameDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
