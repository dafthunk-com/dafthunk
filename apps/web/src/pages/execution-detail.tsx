import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";
import { Clock, ArrowLeft, GitCommitHorizontal, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { format } from "date-fns";
import { ExecutionStatusBadge, ExecutionStatus } from "@/components/executions/execution-status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NodeExecution {
  nodeId: string;
  nodeName: string;
  status: ExecutionStatus;
  startedAt?: string;
  endedAt?: string;
  input?: any;
  output?: any;
  error?: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  deploymentId?: string;
  status: ExecutionStatus;
  nodeExecutions: NodeExecution[];
  error?: string;
  startedAt: string;
  endedAt?: string;
}

interface WorkflowInfo {
  id: string;
  name: string;
}

export function ExecutionDetailPage() {
  const { executionId } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExecutionDetails = async () => {
      if (!executionId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/executions/${executionId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch execution: ${response.statusText}`);
        }

        const executionData = await response.json();
        setExecution(executionData);

        // Update breadcrumbs
        setBreadcrumbs([
          { label: "Executions", to: "/executions" },
          { label: `Execution ${executionId.substring(0, 8)}...` },
        ]);

        // Fetch workflow info if available
        if (executionData.workflowId) {
          try {
            const workflowResponse = await fetch(`${API_BASE_URL}/workflows/${executionData.workflowId}`, {
              credentials: "include",
            });
            
            if (workflowResponse.ok) {
              const workflowData = await workflowResponse.json();
              setWorkflow(workflowData);
              
              // Update breadcrumbs with workflow name
              setBreadcrumbs([
                { label: "Executions", to: "/executions" },
                { label: workflowData.name, to: `/workflows/playground/${workflowData.id}` },
                { label: `Execution ${executionId.substring(0, 8)}...` },
              ]);
            }
          } catch (error) {
            console.error("Error fetching workflow info:", error);
            // Continue without workflow info
          }
        }
      } catch (error) {
        console.error("Error fetching execution:", error);
        toast.error("Failed to fetch execution details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExecutionDetails();
  }, [executionId, setBreadcrumbs]);

  const calculateDuration = (startedAt: string, endedAt?: string) => {
    if (!startedAt) return "N/A";
    
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    
    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPpp");
    } catch (error) {
      return dateString;
    }
  };

  return (
    <InsetLayout title="Execution Details">
      {isLoading ? (
        <div className="py-10 text-center">Loading execution information...</div>
      ) : execution ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Viewing details for execution {executionId}
              </p>
              <Button variant="outline" onClick={() => navigate("/executions")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Executions
              </Button>
            </div>
          </div>

          {/* Execution Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Status</CardTitle>
              <CardDescription>
                Current status and overview of this workflow execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <ExecutionStatusBadge status={execution.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started:</span>
                    <span>{formatDateTime(execution.startedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed:</span>
                    <span>{formatDateTime(execution.endedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{calculateDuration(execution.startedAt, execution.endedAt)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Execution ID:</span>
                    <span className="font-mono text-xs">{execution.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Workflow:</span>
                    {workflow ? (
                      <Link 
                        to={`/workflows/playground/${execution.workflowId}`}
                        className="hover:underline text-primary"
                      >
                        {workflow.name}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{execution.workflowId}</span>
                    )}
                  </div>
                  {execution.deploymentId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deployment:</span>
                      <Link 
                        to={`/workflows/deployments/version/${execution.deploymentId}`}
                        className="hover:underline text-primary font-mono text-xs"
                      >
                        {execution.deploymentId}
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {execution.error && (
                <div className="mt-4 p-3 border border-destructive/20 bg-destructive/10 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Error</p>
                      <p className="text-sm font-mono whitespace-pre-wrap">{execution.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Execution not found</p>
          <Button
            className="mt-4"
            onClick={() => navigate("/executions")}
          >
            Back to Executions
          </Button>
        </div>
      )}
    </InsetLayout>
  );
} 