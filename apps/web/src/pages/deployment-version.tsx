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
  
  // Initialize with empty breadcrumbs
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
      
      // Update breadcrumb with actual workflow name and deployment ID
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { 
          label: workflowData.name, 
          to: `/workflows/deployments/${workflowId}` 
        },
        { label: `${deploymentId}` }
      ]);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      toast.error("Failed to fetch workflow details.");
    }
  };

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
    <InsetLayout title={deployment?.id || "Deployment Version"}>
      {isLoading ? (
        <div className="py-10 text-center">Loading deployment details...</div>
      ) : deployment ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Version</CardTitle>
              <CardDescription>
                Details about this specific deployment
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
                {workflow && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <FileCode className="mr-1 h-4 w-4" /> Workflow
                    </p>
                    <p className="mt-1">{workflow.name}</p>
                    <p className="font-mono text-xs mt-1 text-muted-foreground">{workflow.id}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
                    <Hash className="mr-1 h-4 w-4" /> Workflow ID
                  </p>
                  <p className="font-mono text-sm mt-1">{deployment.workflowId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Clock className="mr-1 h-4 w-4" /> Created
                  </p>
                  <p className="mt-1">{formatDate(deployment.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Clock className="mr-1 h-4 w-4" /> Updated
                  </p>
                  <p className="mt-1">{formatDate(deployment.updatedAt)}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nodes</p>
                    <p className="font-medium">{deployment.nodes.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Edges</p>
                    <p className="font-medium">{deployment.edges.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Deployment not found</p>
          <Button 
            className="mt-4" 
            onClick={() => navigate('/workflows/deployments')}
          >
            Back to Deployments
          </Button>
        </div>
      )}
    </InsetLayout>
  );
} 