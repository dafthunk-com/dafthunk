import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { toast } from "sonner";
import type { WorkflowDeploymentVersion } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { WorkflowInfoCard } from "@/components/deployments/workflow-info-card";
import { DeploymentInfoCard } from "@/components/deployments/deployment-info-card";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Node, Edge } from "@xyflow/react";
import type {
  WorkflowNodeType,
  WorkflowEdgeType,
} from "@/components/workflow/workflow-types.tsx";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { InsetLoading } from "@/components/inset-loading";
import {
  useNodeTemplates,
  useDeploymentVersion,
  useWorkflowDetails,
} from "@/hooks/use-fetch";
import {
  ExecutionFormDialog,
  type DialogFormParameter,
} from "@/components/workflow/execution-form-dialog";
import {
  extractDialogParametersFromNodes,
  adaptDeploymentNodesToReactFlowNodes,
} from "@/utils/utils";

export function DeploymentVersionPage() {
  const { deploymentId = "" } = useParams<{ deploymentId: string }>();
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);

  // State for execution dialog
  const [showExecutionForm, setShowExecutionForm] = useState(false);
  const [formParameters, setFormParameters] = useState<DialogFormParameter[]>(
    []
  );
  const executionContextRef = useRef<{ deploymentId: string } | null>(null);

  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const { nodeTemplates, nodeTemplatesError, isNodeTemplatesLoading } =
    useNodeTemplates();

  const {
    deploymentVersion,
    deploymentVersionError,
    isDeploymentVersionLoading,
    mutateDeploymentVersion,
  } = useDeploymentVersion(deploymentId);

  // Use the new hook for Workflow Details
  const { workflowDetails, workflowDetailsError, isWorkflowDetailsLoading } =
    useWorkflowDetails(deploymentVersion?.workflowId);

  // Update breadcrumbs when both workflow and deployment are available
  useEffect(() => {
    if (workflowDetails && deploymentVersion) {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        {
          label: workflowDetails.name,
          to: `/workflows/deployments/${workflowDetails.id}`,
        },
        { label: `v${deploymentVersion.version}` },
      ]);
    } else if (deploymentVersion) {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { label: `v${deploymentVersion.version}` },
      ]);
    }
  }, [workflowDetails, deploymentVersion, setBreadcrumbs]);

  const transformDeploymentToReactFlow = useCallback(
    (currentDeploymentData: WorkflowDeploymentVersion) => {
      if (!currentDeploymentData) return;
      try {
        const reactFlowNodes: Node<WorkflowNodeType>[] =
          currentDeploymentData.nodes.map((node) => ({
            id: node.id,
            type: "workflowNode",
            position: node.position,
            data: {
              name: node.name,
              inputs: node.inputs.map((input) => ({
                id: input.name,
                type: input.type,
                name: input.name,
                value: input.value,
                hidden: input.hidden,
                required: input.required,
              })),
              outputs: node.outputs.map((output) => ({
                id: output.name,
                type: output.type,
                name: output.name,
                hidden: output.hidden,
              })),
              executionState: "idle" as const,
              nodeType: node.type,
            },
          }));
        const reactFlowEdges: Edge<WorkflowEdgeType>[] =
          currentDeploymentData.edges.map((edge, index) => ({
            id: `e${index}`,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceOutput,
            targetHandle: edge.targetInput,
            type: "workflowEdge",
            data: {
              isValid: true,
              sourceType: edge.sourceOutput,
              targetType: edge.targetInput,
            },
          }));
        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
      } catch (error) {
        console.error(
          "Error transforming deployment to ReactFlow format:",
          error
        );
        toast.error("Failed to process workflow structure.");
      }
    },
    []
  );

  useEffect(() => {
    if (deploymentVersion) {
      transformDeploymentToReactFlow(deploymentVersion);
    }
  }, [deploymentVersion, transformDeploymentToReactFlow]);

  useEffect(() => {
    if (!deploymentVersion) return;
    try {
      const adaptedNodes = adaptDeploymentNodesToReactFlowNodes(
        deploymentVersion.nodes
      );
      setNodes(adaptedNodes);
    } catch (error) {
      console.error("Error adapting nodes:", error);
    }
  }, [deploymentVersion]);

  const validateConnection = useCallback(() => false, []);

  // Renamed original executeDeployment to this, to be called by dialog or directly
  const performActualDeploymentExecution = async (
    execDeploymentId: string,
    requestBody?: Record<string, any>
  ) => {
    if (!execDeploymentId) return;
    toast.info("Initiating deployment execution...");
    try {
      const response = await fetch(
        `${API_BASE_URL}/deployments/version/${execDeploymentId}/execute`,
        {
          method: "POST",
          credentials: "include",
          headers:
            requestBody && Object.keys(requestBody).length > 0
              ? { "Content-Type": "application/json" }
              : {},
          body:
            requestBody && Object.keys(requestBody).length > 0
              ? JSON.stringify(requestBody)
              : undefined,
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to execute deployment: ${response.statusText} (Status: ${response.status})`
        );
      }
      // Assuming the response on 2xx is minimal or just a success indicator, not new execution data to process here.
      // The backend /execute endpoint now returns the initial execution object (201).
      // For a deployed version execution, we might want to navigate to an executions page or show more detailed feedback.
      // For now, just a success toast.
      const executionResult = await response.json();
      toast.success(
        `Deployment execution started successfully. Execution ID: ${executionResult.id}`
      );
      // Optionally, navigate: navigate(`/workflows/executions/${executionResult.id}`);
    } catch (error) {
      console.error("Error executing deployment:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to execute deployment. Please try again."
      );
    }
  };

  const handleExecuteDeploymentClick = useCallback(async () => {
    if (!deploymentVersion || !deploymentVersion.nodes) {
      toast.error("Deployment data or nodes not available.");
      return;
    }

    // Use the adapter and utility function
    const currentTemplates = nodeTemplates || [];
    const adaptedNodes = adaptDeploymentNodesToReactFlowNodes(
      deploymentVersion.nodes
    );
    const httpParameterNodes = extractDialogParametersFromNodes(
      adaptedNodes,
      currentTemplates
    );

    if (httpParameterNodes.length > 0) {
      setFormParameters(httpParameterNodes);
      executionContextRef.current = { deploymentId: deploymentVersion.id };
      setShowExecutionForm(true);
    } else {
      performActualDeploymentExecution(deploymentVersion.id, {});
    }
  }, [
    deploymentVersion,
    nodeTemplates,
    performActualDeploymentExecution,
    adaptDeploymentNodesToReactFlowNodes,
  ]);

  if (
    isDeploymentVersionLoading ||
    isNodeTemplatesLoading ||
    isWorkflowDetailsLoading
  ) {
    return <InsetLoading title="Deployment" />;
  }

  if (deploymentVersionError) {
    return (
      <InsetLayout title="Error">
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <p>
            Failed to load deployment details: {deploymentVersionError.message}
          </p>
          <Button onClick={() => mutateDeploymentVersion()} className="mt-4">
            Retry
          </Button>
        </div>
      </InsetLayout>
    );
  }

  return (
    <InsetLayout
      title={
        deploymentVersion?.version
          ? `Version ${deploymentVersion.version}`
          : "Deployment"
      }
    >
      {deploymentVersion ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Details for this workflow deployment version
              </p>
              <Button
                onClick={handleExecuteDeploymentClick}
                disabled={
                  !deploymentId ||
                  !deploymentVersion?.nodes ||
                  isNodeTemplatesLoading
                }
              >
                <Play className="mr-2 h-4 w-4" />
                Execute Version
              </Button>
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {workflowDetails && (
                <WorkflowInfoCard
                  id={workflowDetails.id}
                  name={workflowDetails.name}
                  description="Details about this workflow"
                />
              )}
              {isWorkflowDetailsLoading && !workflowDetails && (
                <p>Loading workflow details...</p>
              )}
              {workflowDetailsError && (
                <p className="text-red-500">
                  Error loading workflow details: {workflowDetailsError.message}
                </p>
              )}

              <DeploymentInfoCard
                id={deploymentVersion.id}
                version={deploymentVersion.version}
                createdAt={deploymentVersion.createdAt}
              />
            </TabsContent>

            <TabsContent value="workflow" className="mt-4">
              <div className="h-[calc(100vh-280px)] border rounded-md">
                {nodes.length > 0 && nodeTemplates && (
                  <WorkflowBuilder
                    workflowId={deploymentVersion.id}
                    initialNodes={nodes}
                    initialEdges={edges}
                    nodeTemplates={nodeTemplates || []}
                    validateConnection={validateConnection}
                    readonly={true}
                  />
                )}
                {(nodes.length === 0 || !nodeTemplates) && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      No workflow structure available or templates not loaded.
                    </p>
                  </div>
                )}
                {nodeTemplatesError && (
                  <div className="absolute top-4 right-4 bg-amber-100 px-3 py-1 rounded-md text-amber-800 text-sm">
                    Error loading node templates: {nodeTemplatesError.message}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Deployment not found</p>
        </div>
      )}
      {showExecutionForm && deploymentVersion && (
        <ExecutionFormDialog
          isOpen={showExecutionForm}
          onClose={() => setShowExecutionForm(false)}
          parameters={formParameters}
          onSubmit={(formData) => {
            setShowExecutionForm(false);
            if (executionContextRef.current) {
              performActualDeploymentExecution(
                executionContextRef.current.deploymentId,
                formData
              );
            }
          }}
        />
      )}
    </InsetLayout>
  );
}
