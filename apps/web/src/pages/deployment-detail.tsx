import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { toast } from "sonner";
import { WorkflowDeploymentVersion } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import { ArrowUpToLine, History } from "lucide-react";
import { DeploymentHistoryTable } from "@/components/deployments/history-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { WorkflowInfoCard } from "@/components/deployments/workflow-info-card";
import { DeploymentInfoCard } from "@/components/deployments/deployment-info-card";

interface WorkflowInfo {
  id: string;
  name: string;
}

export function DeploymentDetailPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const [workflow, setWorkflow] = useState<WorkflowInfo | null>(null);
  const [currentDeployment, setCurrentDeployment] = useState<WorkflowDeploymentVersion | null>(null);
  const [deploymentHistory, setDeploymentHistory] = useState<WorkflowDeploymentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  // Fetch the deployment history for this workflow
  const fetchDeploymentHistory = async () => {
    if (!workflowId) return;
    
    try {
      setIsHistoryLoading(true);
      const response = await fetch(`${API_BASE_URL}/deployments/history/${workflowId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deployment history: ${response.statusText}`);
      }

      const data = await response.json();
      setWorkflow(data.workflow);
      setDeploymentHistory(data.deployments);
      
      // Update breadcrumbs with workflow name
      if (data.workflow) {
        setBreadcrumbs([
          { label: "Deployments", to: "/workflows/deployments" },
          { label: data.workflow.name }
        ]);
      }
      
      if (data.deployments.length > 0) {
        // Set the first deployment (latest) as the current one
        setCurrentDeployment(data.deployments[0]);
      }
    } catch (error) {
      console.error("Error fetching deployment history:", error);
      toast.error("Failed to fetch deployment history. Please try again.");
    } finally {
      setIsHistoryLoading(false);
      setIsLoading(false);
    }
  };

  // Load the deployment history on component mount
  useEffect(() => {
    fetchDeploymentHistory();
  }, [workflowId]);

  const deployWorkflow = async () => {
    if (!workflowId) return;

    try {
      setIsDeploying(true);
      const response = await fetch(`${API_BASE_URL}/deployments/${workflowId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to deploy workflow: ${response.statusText}`);
      }

      toast.success("Workflow deployed successfully");
      
      setIsDeployDialogOpen(false);
      fetchDeploymentHistory();
    } catch (error) {
      console.error("Error deploying workflow:", error);
      toast.error("Failed to deploy workflow. Please try again.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <InsetLayout title={workflow?.name || "Workflow Deployments"}>
      {isLoading ? (
        <div className="py-10 text-center">Loading workflow information...</div>
      ) : workflow ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Manage deployments for this workflow
              </p>
              <Button onClick={() => setIsDeployDialogOpen(true)}>
                <ArrowUpToLine className="mr-2 h-4 w-4" />
                Deploy Latest Version
              </Button>
            </div>
          </div>

          {currentDeployment ? (
            <>
              <WorkflowInfoCard 
                id={workflow.id} 
                name={workflow.name} 
                description="Details about the workflow being deployed"
              />

              <DeploymentInfoCard
                id={currentDeployment.id}
                version={currentDeployment.version}
                createdAt={currentDeployment.createdAt}
                title="Current Deployment"
                description="Latest deployment of this workflow"
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="mr-2 h-4 w-4" />
                    Deployment History
                  </CardTitle>
                  <CardDescription>
                    Previous versions of this workflow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DeploymentHistoryTable 
                    deployments={deploymentHistory}
                    currentDeploymentId={currentDeployment.id}
                    workflowId={workflow.id}
                    isLoading={isHistoryLoading}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-lg">No deployments found for this workflow.</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsDeployDialogOpen(true)}
              >
                Deploy Workflow
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Workflow not found</p>
          <Button 
            className="mt-4" 
            onClick={() => navigate('/workflows/deployments')}
          >
            Back to Deployments
          </Button>
        </div>
      )}

      {/* Deploy Dialog */}
      <Dialog
        open={isDeployDialogOpen}
        onOpenChange={setIsDeployDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy Workflow</DialogTitle>
            <DialogDescription>
              This will create a new deployment of "{workflow?.name}".
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeployDialogOpen(false)}
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
  );
} 