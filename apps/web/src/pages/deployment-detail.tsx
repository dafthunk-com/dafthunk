import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { toast } from "sonner";
import { WorkflowDeploymentVersion } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import { format } from "date-fns";
import { ArrowLeft, ArrowUpToLine, Clock, Hash, History } from "lucide-react";
import { DeploymentHistoryTable } from "@/components/deployments/history-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WorkflowInfo {
  id: string;
  name: string;
}

export function DeploymentDetailPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  
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

  const handleCreateDeployment = () => {
    setIsDeployDialogOpen(true);
  };

  const deployWorkflow = async () => {
    if (!workflowId) return;

    try {
      setIsDeploying(true);
      const response = await fetch(`${API_BASE_URL}/deployments/${workflowId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to create deployment: ${response.statusText}`);
      }

      toast.success("Workflow deployed successfully");
      
      // Close the dialog and refresh the deployments
      setIsDeployDialogOpen(false);
      fetchDeploymentHistory();
    } catch (error) {
      console.error("Error creating deployment:", error);
      toast.error("Failed to create deployment. Please try again.");
    } finally {
      setIsDeploying(false);
    }
  };

  // Format a date string
  const formatDate = (dateString: string | Date) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return String(dateString);
    }
  };

  return (
    <InsetLayout title={workflow?.name || "Workflow Deployments"}>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workflows/deployments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Deployments
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center">Loading workflow information...</div>
      ) : workflow ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">{workflow.name}</h2>
              <p className="text-muted-foreground">
                Workflow ID: <code className="text-xs">{workflow.id}</code>
              </p>
            </div>
            <Button onClick={handleCreateDeployment}>
              <ArrowUpToLine className="mr-2 h-4 w-4" />
              Deploy New Version
            </Button>
          </div>

          {currentDeployment ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current Deployment</CardTitle>
                  <CardDescription>
                    Details about the latest deployment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Hash className="mr-1 h-4 w-4" /> Deployment ID
                      </p>
                      <p className="font-mono text-sm mt-1">{currentDeployment.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Clock className="mr-1 h-4 w-4" /> Created
                      </p>
                      <p className="mt-1">{formatDate(currentDeployment.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Hash className="mr-1 h-4 w-4" /> Nodes
                      </p>
                      <p className="mt-1">{currentDeployment.nodes.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Hash className="mr-1 h-4 w-4" /> Edges
                      </p>
                      <p className="mt-1">{currentDeployment.edges.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center">
                        <History className="mr-2 h-4 w-4" />
                        Deployment History
                      </CardTitle>
                      <CardDescription>
                        Previous versions of this workflow
                      </CardDescription>
                    </div>
                  </div>
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
                onClick={handleCreateDeployment}
              >
                Create First Deployment
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
              This will create a new deployment version of "{workflow?.name}" based on the current workflow state.
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