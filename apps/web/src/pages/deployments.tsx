import { useState, useEffect } from "react";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { DataTable } from "@/components/deployments/data-table";
import { columns, DeploymentWithActions } from "@/components/deployments/columns";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { WorkflowDeployment } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import { useNavigate } from "react-router-dom";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Type for the workflows to select from
interface WorkflowOption {
  id: string;
  name: string;
}

export function DeploymentsPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const [deployments, setDeployments] = useState<WorkflowDeployment[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);

  // Set breadcrumbs on component mount
  useEffect(() => {
    setBreadcrumbs([
      { label: "Deployments" }
    ]);
  }, []);

  // Fetch the deployments
  const fetchDeployments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/deployments`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deployments: ${response.statusText}`);
      }

      const data = await response.json();
      setDeployments(data.workflows);
    } catch (error) {
      console.error("Error fetching deployments:", error);
      toast.error("Failed to fetch deployments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available workflows for the create dialog
  const fetchWorkflows = async () => {
    try {
      setIsLoadingWorkflows(true);
      const response = await fetch(`${API_BASE_URL}/workflows`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`);
      }

      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Failed to fetch workflows. Please try again.");
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  // Load deployments on component mount
  useEffect(() => {
    fetchDeployments();
  }, []);

  // Load workflows when the create dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      fetchWorkflows();
    }
  }, [isCreateDialogOpen]);

  const handleViewDeployment = (workflowId: string) => {
    navigate(`/workflows/deployments/${workflowId}`);
  };

  const handleCreateDeployment = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setIsDeployDialogOpen(true);
  };

  const deployWorkflow = async () => {
    if (!selectedWorkflowId) return;

    try {
      setIsDeploying(true);
      const response = await fetch(`${API_BASE_URL}/deployments/${selectedWorkflowId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to create deployment: ${response.statusText}`);
      }

      // Get the deployment data
      const deploymentData = await response.json();
      
      toast.success("Workflow deployed successfully");
      
      // Close the dialogs and refresh the deployments list
      setIsDeployDialogOpen(false);
      setIsCreateDialogOpen(false);
      setSelectedWorkflowId(null);
      fetchDeployments();
      
      // Navigate to the deployment details
      navigate(`/workflows/deployments/${selectedWorkflowId}`);
    } catch (error) {
      console.error("Error creating deployment:", error);
      toast.error("Failed to create deployment. Please try again.");
    } finally {
      setIsDeploying(false);
    }
  };

  // Add actions to the deployments
  const deploymentsWithActions: DeploymentWithActions[] = deployments.map(deployment => ({
    ...deployment,
    onViewLatest: handleViewDeployment,
    onCreateDeployment: handleCreateDeployment
  }));

  return (
    <TooltipProvider>
      <InsetLayout title="Deployments">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Manage your workflow deployments across different environments.
          </p>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) setSelectedWorkflowId(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="size-4" />
                Create Deployment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Deployment</DialogTitle>
                <DialogDescription>
                  Select a workflow to create a new deployment.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="workflow">Select Workflow</Label>
                  {isLoadingWorkflows ? (
                    <div className="text-sm text-muted-foreground">Loading workflows...</div>
                  ) : workflows.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No workflows available</div>
                  ) : (
                    <Select 
                      onValueChange={(value) => setSelectedWorkflowId(value)}
                      value={selectedWorkflowId || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a workflow" />
                      </SelectTrigger>
                      <SelectContent>
                        {workflows.map((workflow) => (
                          <SelectItem key={workflow.id} value={workflow.id}>
                            {workflow.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedWorkflowId(null);
                    setIsCreateDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={deployWorkflow} 
                  disabled={isDeploying || !selectedWorkflowId}
                >
                  {isDeploying ? "Deploying..." : "Create Deployment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <DataTable
          columns={columns}
          data={deploymentsWithActions}
          isLoading={isLoading}
          emptyState={{
            title: "No deployments found",
            description: "Deploy a workflow to get started.",
          }}
        />
        
        {!isLoading && (
          <div className="text-xs text-muted-foreground mt-4">
            Showing <strong>{deployments.length}</strong> workflow deployments.
          </div>
        )}

        {/* Deploy Dialog from List */}
        <Dialog
          open={isDeployDialogOpen}
          onOpenChange={setIsDeployDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deploy Workflow</DialogTitle>
              <DialogDescription>
                This will create a new deployment of the current workflow state.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedWorkflowId(null);
                  setIsDeployDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={deployWorkflow} 
                disabled={isDeploying}
              >
                {isDeploying ? "Deploying..." : "Deploy"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </InsetLayout>
    </TooltipProvider>
  );
}
