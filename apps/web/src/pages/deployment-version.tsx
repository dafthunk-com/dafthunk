import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { toast } from "sonner";
import type { WorkflowDeploymentVersion } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { WorkflowInfoCard } from "@/components/deployments/workflow-info-card";
import { DeploymentInfoCard } from "@/components/deployments/deployment-info-card";
import { ApiIntegrationCard } from "@/components/deployments/api-integration-card";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Node, Edge } from "@xyflow/react";
import type {
  WorkflowNodeType,
  WorkflowEdgeType,
  WorkflowExecution,
} from "@/components/workflow/workflow-types.tsx";
import { Button } from "@/components/ui/button";
import { Play, ChevronDown } from "lucide-react";
import { InsetLoading } from "@/components/inset-loading";
import { useNodeTemplates, useDeploymentVersion } from "@/hooks/use-fetch";
import { useWorkflow } from "@/services/workflowService";
import { ExecutionFormDialog } from "@/components/workflow/execution-form-dialog";
import { adaptDeploymentNodesToReactFlowNodes } from "@/utils/utils";
import { useWorkflowExecutor } from "@/hooks/use-workflow-executor";
import { executeDeployment } from "@/services/deploymentService";
import type { ExecuteDeploymentOptions } from "@/services/deploymentService";
import { useAuth } from "@/components/authContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DeploymentVersionPage() {
  const { deploymentId = "" } = useParams<{ deploymentId: string }>();
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  // Configure the workflow executor with the deployment execution URL
  const {
    executeWorkflow,
    isExecutionFormVisible,
    executionFormParameters,
    submitExecutionForm,
    closeExecutionForm,
  } = useWorkflowExecutor({
    executeUrlFn: (deploymentId) =>
      `${API_BASE_URL}/deployments/version/${deploymentId}/execute`,
  });

  const { nodeTemplates, nodeTemplatesError, isNodeTemplatesLoading } =
    useNodeTemplates();

  const {
    deploymentVersion,
    deploymentVersionError,
    isDeploymentVersionLoading,
    mutateDeploymentVersion,
  } = useDeploymentVersion(deploymentId);

  // Use the new hook for Workflow Details from workflowService.ts
  const { workflow, workflowError, isWorkflowLoading } = useWorkflow(
    deploymentVersion?.workflowId || null
  );

  // Update breadcrumbs when both workflow and deployment are available
  useEffect(() => {
    if (workflow && deploymentVersion) {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        {
          label: workflow.name,
          to: `/workflows/deployments/${workflow.id}`,
        },
        { label: `v${deploymentVersion.version}` },
      ]);
    } else if (deploymentVersion) {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { label: `v${deploymentVersion.version}` },
      ]);
    }
  }, [workflow, deploymentVersion, setBreadcrumbs]);

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

  // Handle execution result to show toast notifications
  const handleExecutionUpdate = useCallback((execution: WorkflowExecution) => {
    if (execution.status === "completed") {
      toast.success("Deployment execution completed successfully");
    } else if (execution.status === "error") {
      toast.error(`Execution error: ${execution.error || "Unknown error"}`);
    }
  }, []);

  const handleExecuteDeploymentClick = useCallback(() => {
    if (!deploymentVersion || !deploymentVersion.nodes) {
      toast.error("Deployment data or nodes not available.");
      return;
    }

    if (!orgHandle) {
      toast.error("Organization context not available.");
      return;
    }

    toast.info("Preparing deployment execution...");

    // Use the adapter to convert backend nodes to ReactFlow format
    const adaptedNodes = adaptDeploymentNodesToReactFlowNodes(
      deploymentVersion.nodes
    );

    // Execute the workflow using the workflow executor (with UI form)
    executeWorkflow(
      deploymentVersion.id,
      handleExecutionUpdate,
      adaptedNodes,
      nodeTemplates || []
    );
  }, [
    deploymentVersion,
    nodeTemplates,
    executeWorkflow,
    handleExecutionUpdate,
    orgHandle,
  ]);

  // Direct execution without form UI
  const handleDirectExecution = useCallback(async () => {
    if (!deploymentVersion || !orgHandle) {
      toast.error("Deployment data or organization context not available.");
      return;
    }

    toast.info("Starting direct execution...");

    try {
      const options: ExecuteDeploymentOptions = {
        monitorProgress: true,
        directExecution: true,
      };

      const result = await executeDeployment(
        deploymentVersion.id,
        orgHandle,
        options
      );
      toast.success(`Execution started with ID: ${result.id}`);
    } catch (error) {
      toast.error(
        `Failed to execute deployment: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, [deploymentVersion, orgHandle]);

  if (
    isDeploymentVersionLoading ||
    isNodeTemplatesLoading ||
    isWorkflowLoading
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={
                      !deploymentId ||
                      !deploymentVersion?.nodes ||
                      isNodeTemplatesLoading
                    }
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Execute Version
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExecuteDeploymentClick}>
                    Execute with Parameter Form
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDirectExecution}>
                    Execute Directly (No UI)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      if (!deploymentVersion || !orgHandle) return;
                      try {
                        const options: ExecuteDeploymentOptions = {
                          monitorProgress: true,
                          debugMode: true,
                        };
                        const result = await executeDeployment(
                          deploymentVersion.id,
                          orgHandle,
                          options
                        );
                        toast.success(
                          `Debug execution started with ID: ${result.id}`
                        );
                      } catch (error) {
                        toast.error(
                          `Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
                        );
                      }
                    }}
                  >
                    Execute in Debug Mode
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {workflow && (
                <WorkflowInfoCard
                  id={workflow.id}
                  name={workflow.name}
                  description="Details about this workflow"
                />
              )}
              {isWorkflowLoading && !workflow && (
                <p>Loading workflow details...</p>
              )}
              {workflowError && (
                <p className="text-red-500">
                  Error loading workflow details: {workflowError.message}
                </p>
              )}

              <DeploymentInfoCard
                id={deploymentVersion.id}
                version={deploymentVersion.version}
                createdAt={deploymentVersion.createdAt}
              />

              {nodeTemplates && (
                <ApiIntegrationCard
                  deploymentId={deploymentVersion.id}
                  nodes={nodes}
                  nodeTemplates={nodeTemplates}
                />
              )}
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

      {/* Execution Parameters Dialog */}
      {isExecutionFormVisible && (
        <ExecutionFormDialog
          isOpen={isExecutionFormVisible}
          onClose={closeExecutionForm}
          parameters={executionFormParameters}
          onSubmit={submitExecutionForm}
        />
      )}
    </InsetLayout>
  );
}
