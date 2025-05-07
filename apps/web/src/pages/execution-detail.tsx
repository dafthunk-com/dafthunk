import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";
import { AlertCircle } from "lucide-react";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { format } from "date-fns";
import { ExecutionStatusBadge } from "@/components/executions/execution-status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import {
  NodeTemplate,
  WorkflowExecution as WorkflowBuilderExecution,
  WorkflowNodeExecution,
  WorkflowExecutionStatus as WorkflowBuilderExecutionStatus,
} from "@/components/workflow/workflow-types";
import { fetchNodeTypes } from "@/services/workflowNodeService";
import { workflowEdgeService } from "@/services/workflowEdgeService";
import { WorkflowExecution, NodeExecution } from "@dafthunk/types";

interface WorkflowInfo {
  id: string;
  name: string;
}

export function ExecutionDetailPage() {
  const { executionId } = useParams();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowInfo | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [nodeTemplates, setNodeTemplates] = useState<NodeTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [workflowBuilderExecution, setWorkflowBuilderExecution] =
    useState<WorkflowBuilderExecution | null>(null);

  // Fetch node templates/types
  useEffect(() => {
    const loadNodeTemplates = async () => {
      try {
        const types = await fetchNodeTypes();
        const templates: NodeTemplate[] = types.map((type) => ({
          id: type.id,
          type: type.id,
          name: type.name,
          description: type.description || "",
          category: type.category,
          inputs: type.inputs.map((input) => ({
            id: input.name,
            type: input.type,
            name: input.name,
            hidden: input.hidden,
          })),
          outputs: type.outputs.map((output) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            hidden: output.hidden,
          })),
        }));
        setNodeTemplates(templates);
        setTemplatesError(null);
      } catch (_error) {
        setTemplatesError(
          "Failed to load node templates. Some nodes may not display correctly."
        );
      }
    };
    loadNodeTemplates();
  }, []);

  // Fetch execution and workflow/deployment structure
  useEffect(() => {
    const fetchExecutionDetails = async () => {
      if (!executionId) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/executions/${executionId}`,
          {
            credentials: "include",
          }
        );
        if (!response.ok)
          throw new Error(`Failed to fetch execution: ${response.statusText}`);
        const executionData: WorkflowExecution = await response.json();
        setExecution(executionData);

        // Map API execution to builder execution format
        const builderExecution: WorkflowBuilderExecution = {
          status: executionData.status as WorkflowBuilderExecutionStatus,
          nodeExecutions: executionData.nodeExecutions.map(
            (nodeExec: NodeExecution): WorkflowNodeExecution => ({
              nodeId: nodeExec.nodeId,
              status: nodeExec.status as any,
              outputs: nodeExec.outputs || {},
              error: nodeExec.error,
            })
          ),
        };
        setWorkflowBuilderExecution(builderExecution);

        setBreadcrumbs([
          { label: "Executions", to: "/workflows/executions" },
          { label: `${executionId}` },
        ]);

        // Fetch workflow info if available
        if (executionData.workflowId) {
          try {
            const workflowResponse = await fetch(
              `${API_BASE_URL}/workflows/${executionData.workflowId}`,
              {
                credentials: "include",
              }
            );
            if (workflowResponse.ok) {
              const workflowData = await workflowResponse.json();
              setWorkflow(workflowData);
            }
          } catch (_error) {
            // Continue without workflow info
          }
        }

        // Fetch deployment/workflow structure for visualization
        if (executionData.deploymentId) {
          // Prefer deployment for exact structure
          const depRes = await fetch(
            `${API_BASE_URL}/deployments/version/${executionData.deploymentId}`,
            {
              credentials: "include",
            }
          );
          if (depRes.ok) {
            const depData = await depRes.json();
            transformStructureToReactFlow(
              depData.nodes,
              depData.edges,
              executionData.nodeExecutions
            );
            return;
          }
        }

        // Fallback: fetch workflow structure
        if (executionData.workflowId) {
          const wfRes = await fetch(
            `${API_BASE_URL}/workflows/${executionData.workflowId}`,
            {
              credentials: "include",
            }
          );
          if (wfRes.ok) {
            const wfData = await wfRes.json();
            transformStructureToReactFlow(
              wfData.nodes,
              wfData.edges,
              executionData.nodeExecutions
            );
            return;
          }
        }

        // If no structure found, clear
        setNodes([]);
        setEdges([]);
      } catch (error) {
        console.error("Error fetching execution:", error);
        toast.error("Failed to fetch execution details. Please try again.");
      }
    };
    fetchExecutionDetails();
  }, [executionId, setBreadcrumbs]);

  // Merge execution state into nodes
  function transformStructureToReactFlow(
    structureNodes: any[],
    structureEdges: any[],
    nodeExecutions: NodeExecution[]
  ) {
    // Map nodeExecutions by nodeId for fast lookup
    const execMap = new Map<string, NodeExecution>();
    for (const n of nodeExecutions || []) execMap.set(n.nodeId, n);

    // Transform nodes
    const reactFlowNodes = structureNodes.map((node) => {
      const exec = execMap.get(node.id);
      return {
        id: node.id,
        type: "workflowNode",
        position: node.position,
        data: {
          name: node.name,
          inputs: node.inputs.map((input: any) => ({
            id: input.name,
            type: input.type,
            name: input.name,
            value: (exec as any)?.input?.[input.name] ?? input.value,
            hidden: input.hidden,
            required: input.required,
          })),
          outputs: node.outputs.map((output: any) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            value: exec?.outputs?.[output.name],
            hidden: output.hidden,
          })),
          executionState: exec?.status || "idle",
          error: exec?.error,
          nodeType: node.type,
        },
      };
    });

    // Transform edges
    const reactFlowEdges = Array.from(
      workflowEdgeService.convertToReactFlowEdges(structureEdges)
    );

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }

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
    } catch (_error) {
      return dateString;
    }
  };

  const validateConnection = () => false;

  return (
    <InsetLayout title={`${executionId}`}>
      {execution ? (
        <div className="space-y-6">
          <Tabs defaultValue="status">
            <TabsList>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
            </TabsList>
            <TabsContent value="status" className="space-y-6 mt-4">
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
                        <ExecutionStatusBadge
                          status={execution.status as any}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Started:</span>
                        <span>
                          {formatDateTime(execution.startedAt as string)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Completed:
                        </span>
                        <span>
                          {formatDateTime(execution.endedAt as string)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>
                          {calculateDuration(
                            execution.startedAt as string,
                            execution.endedAt as string
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Execution ID:
                        </span>
                        <span className="font-mono text-xs">
                          {execution.id}
                        </span>
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
                          <span className="font-mono text-xs">
                            {execution.workflowId}
                          </span>
                        )}
                      </div>
                      {execution.deploymentId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Deployment:
                          </span>
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
                          <p className="font-semibold text-destructive">
                            Error
                          </p>
                          <p className="text-sm font-mono whitespace-pre-wrap">
                            {execution.error}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="visualization" className="mt-4">
              <div className="h-[calc(100vh-280px)] border rounded-md relative">
                {nodes.length > 0 && workflowBuilderExecution && (
                  <WorkflowBuilder
                    workflowId={execution.id}
                    initialNodes={nodes}
                    initialEdges={edges}
                    nodeTemplates={nodeTemplates}
                    validateConnection={validateConnection}
                    initialWorkflowExecution={workflowBuilderExecution}
                    readonly={true}
                  />
                )}
                {nodes.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      No workflow structure available
                    </p>
                  </div>
                )}
                {templatesError && (
                  <div className="absolute top-4 right-4 bg-amber-100 px-3 py-1 rounded-md text-amber-800 text-sm">
                    {templatesError}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Execution not found</p>
        </div>
      )}
    </InsetLayout>
  );
}
