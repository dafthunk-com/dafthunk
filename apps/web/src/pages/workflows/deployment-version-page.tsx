import type { WorkflowDeploymentVersion } from "@dafthunk/types";
import type { Edge, Node } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { ApiIntegrationCard } from "@/components/deployments/api-integration-card";
import { DeploymentInfoCard } from "@/components/deployments/deployment-info-card";
import { EmailIntegrationCard } from "@/components/deployments/email-integration-card";
import { WorkflowInfoCard } from "@/components/deployments/workflow-info-card";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExecutionFormDialog } from "@/components/workflow/execution-form-dialog";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowEdgeType,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDeploymentVersion } from "@/services/deployment-service";
import { useObjectService } from "@/services/object-service";
import { useWorkflow, useWorkflowExecution } from "@/services/workflow-service";
import { adaptDeploymentNodesToReactFlowNodes } from "@/utils/utils";

export function DeploymentVersionPage() {
  const { deploymentId = "" } = useParams<{ deploymentId: string }>();
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const { createObjectUrl } = useObjectService();

  // Use empty node templates array since we're in readonly mode
  const nodeTemplates = useMemo(() => [], []);

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

  const {
    executeWorkflow,
    isFormDialogVisible,
    executionFormParameters,
    submitFormData,
    closeExecutionForm,
  } = useWorkflowExecution(orgHandle);

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

  const handleExecuteVersion = useCallback(() => {
    if (!deploymentVersion?.workflowId) return;
    executeWorkflow(
      deploymentVersion.workflowId,
      (execution) => {
        if (execution.status === "submitted") {
          toast.success("Workflow execution submitted");
        } else if (execution.status === "completed") {
          toast.success("Workflow execution completed");
        } else if (execution.status === "error") {
          toast.error("Workflow execution failed");
        }
      },
      nodes,
      nodeTemplates
    );
  }, [deploymentVersion?.workflowId, executeWorkflow, nodes, nodeTemplates]);

  if (isDeploymentVersionLoading || isWorkflowLoading) {
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
              <Button onClick={handleExecuteVersion}>Execute Version</Button>
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

              {deploymentVersion && workflow && workflow.type === "http_request" && (
                <ApiIntegrationCard
                  orgHandle={orgHandle}
                  workflowId={workflow.id}
                  deploymentVersion={deploymentVersion.version.toString()}
                  nodes={nodes}
                  nodeTemplates={nodeTemplates}
                />
              )}

              {deploymentVersion && workflow && workflow.type === "email_message" && (
                <EmailIntegrationCard
                  orgHandle={orgHandle}
                  workflowHandle={workflow.handle}
                  deploymentVersion={deploymentVersion.version.toString()}
                />
              )}
            </TabsContent>

            <TabsContent value="workflow" className="mt-4">
              <div className="h-[calc(100vh-280px)] border rounded-md">
                {nodes.length > 0 && (
                  <WorkflowBuilder
                    workflowId={deploymentVersion.id}
                    initialNodes={nodes}
                    initialEdges={edges}
                    nodeTemplates={nodeTemplates}
                    validateConnection={validateConnection}
                    createObjectUrl={createObjectUrl}
                    readonly={true}
                  />
                )}
                {nodes.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      No workflow structure available or templates not loaded.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {isFormDialogVisible && (
            <ExecutionFormDialog
              isOpen={isFormDialogVisible}
              onClose={closeExecutionForm}
              parameters={executionFormParameters}
              onSubmit={submitFormData}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Deployment not found</p>
        </div>
      )}
    </InsetLayout>
  );
}
