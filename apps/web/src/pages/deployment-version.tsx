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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { WorkflowDeploymentVersion, Workflow } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import { format } from "date-fns";
import { Clock, Hash, FileCode } from "lucide-react";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DeploymentVersionPage() {
  const { deploymentId = "" } = useParams();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState<WorkflowDeploymentVersion | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  // Fetch the workflow data
  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch workflow: ${response.statusText}`);
      }

      const workflowData = await response.json();
      setWorkflow(workflowData);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      toast.error("Failed to fetch workflow details.");
    }
  };

  // Update breadcrumbs when both workflow and deployment are available
  useEffect(() => {
    if (workflow && deployment) {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { 
          label: workflow.name, 
          to: `/workflows/deployments/${workflow.id}` 
        },
        { label: `v${deployment.version}` }
      ]);
    }
  }, [workflow, deployment, setBreadcrumbs]);

  // Fetch the specific deployment version
  const fetchDeployment = async () => {
    if (!deploymentId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/deployments/version/${deploymentId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deployment: ${response.statusText}`);
      }

      const data = await response.json();
      setDeployment(data);
      
      // Fetch workflow data once we have the workflowId
      if (data.workflowId) {
        await fetchWorkflow(data.workflowId);
      }
    } catch (error) {
      console.error("Error fetching deployment:", error);
      toast.error("Failed to fetch deployment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load the deployment on component mount
  useEffect(() => {
    fetchDeployment();
  }, [deploymentId]);

  // Format a date string
  const formatDate = (dateString: string | Date) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return String(dateString);
    }
  };

  return (
    <InsetLayout title={deployment?.version ? `Version ${deployment.version}` : "Deployment"}>
      {isLoading ? (
        <div className="py-10 text-center">Loading deployment details...</div>
      ) : deployment ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Details for this workflow deployment version
              </p>
            </div>
          </div>
          
          {workflow && (
            <Card>
              <CardHeader>
                <CardTitle>Workflow Information</CardTitle>
                <CardDescription>
                  Details about this workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Hash className="mr-1 h-4 w-4" /> Workflow ID
                    </p>
                    <p className="font-mono text-sm mt-1">{workflow.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Name
                    </p>
                    <p className="mt-1">{workflow.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Deployment Information</CardTitle>
              <CardDescription>
                Details about this deployment version
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Hash className="mr-1 h-4 w-4" /> Deployment ID
                  </p>
                  <p className="font-mono text-sm mt-1">{deployment.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Clock className="mr-1 h-4 w-4" /> Deployed
                  </p>
                  <p className="mt-1">{formatDate(deployment.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Version
                  </p>
                  <p className="mt-1">
                    <Badge variant="secondary" className="text-xs">v{deployment.version}</Badge>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Deployment not found</p>
        </div>
      )}
    </InsetLayout>
  );
} 