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
import { format } from "date-fns";
import { ArrowLeft, Clock, Hash } from "lucide-react";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DeploymentVersionPage() {
  const { deploymentId = "" } = useParams();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState<WorkflowDeploymentVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize with empty breadcrumbs
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

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
      
      // Update breadcrumb with actual workflow name and deployment ID
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { 
          label: data.workflowName, 
          to: `/workflows/deployments/${data.workflowId}` 
        },
        { label: `${deploymentId}` }
      ]);
    } catch (error) {
      console.error("Error fetching deployment:", error);
      toast.error("Failed to fetch deployment. Please try again.");
      
      // Set a fallback breadcrumb on error
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { label: "Deployment Details" }
      ]);
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
    <InsetLayout title="Deployment Version">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => deployment?.workflowId 
            ? navigate(`/workflows/deployments/${deployment.workflowId}`)
            : navigate('/workflows/deployments')
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center">Loading deployment details...</div>
      ) : deployment ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Deployment Version</h2>
            <p className="text-muted-foreground">
              Deployment ID: <code className="text-xs">{deployment.id}</code>
            </p>
          </div>

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