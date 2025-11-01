import type { DeploymentVersion, WorkflowType } from "@dafthunk/types";
import type { Edge, Node } from "@xyflow/react";
import Globe from "lucide-react/icons/globe";
import Mail from "lucide-react/icons/mail";
import Play from "lucide-react/icons/play";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { DeploymentInfoCard } from "@/components/deployments/deployment-info-card";
import { WorkflowInfoCard } from "@/components/deployments/workflow-info-card";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTriggerDialog } from "@/components/workflow/email-trigger-dialog";
import { ExecutionEmailDialog } from "@/components/workflow/execution-email-dialog";
import { ExecutionFormDialog } from "@/components/workflow/execution-form-dialog";
import { ExecutionJsonBodyDialog } from "@/components/workflow/execution-json-body-dialog";
import { HttpIntegrationDialog } from "@/components/workflow/http-integration-dialog";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowEdgeType,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDeploymentVersion } from "@/services/deployment-service";
import { useObjectService } from "@/services/object-service";
import { useNodeTypes } from "@/services/type-service";
import { useWorkflow, useWorkflowExecution } from "@/services/workflow-service";

export function DeploymentVersionPage() {
  const { deploymentId = "" } = useParams<{ deploymentId: string }>();
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";
  const { getOrgUrl } = useOrgUrl();

  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const { createObjectUrl } = useObjectService();

  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);
  const [isEmailTriggerDialogOpen, setIsEmailTriggerDialogOpen] =
    useState(false);

  const {
    deploymentVersion,
    deploymentVersionError,
    isDeploymentVersionLoading,
    mutateDeploymentVersion,
  } = useDeploymentVersion(deploymentId);

  const { workflow, workflowError, isWorkflowLoading } = useWorkflow(
    deploymentVersion?.workflowId || null
  );

  const { nodeTypes, isNodeTypesLoading } = useNodeTypes(
    deploymentVersion?.type || workflow?.type
  );

  const {
    executeWorkflow,
    isFormDialogVisible,
    isJsonBodyDialogVisible,
    isEmailFormDialogVisible,
    executionFormParameters,
    executionJsonBodyParameters,
    submitFormData,
    submitJsonBody,
    submitEmailFormData,
    closeExecutionForm,
  } = useWorkflowExecution(orgHandle);

  const transformDeploymentToReactFlow = useCallback(
    (currentDeploymentData: DeploymentVersion) => {
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
              icon: node.icon,
              functionCalling: node.functionCalling,
              createObjectUrl,
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
    [createObjectUrl]
  );

  // Update breadcrumbs when both workflow and deployment are available
  useEffect(() => {
    if (workflow && deploymentVersion) {
      setBreadcrumbs([
        { label: "Deployments", to: getOrgUrl("deployments") },
        {
          label: workflow.name,
          to: getOrgUrl(`deployments/${workflow.id}`),
        },
        { label: `v${deploymentVersion.version}` },
      ]);
    }
  }, [workflow, deploymentVersion, setBreadcrumbs, getOrgUrl]);

  useEffect(() => {
    if (deploymentVersion) {
      transformDeploymentToReactFlow(deploymentVersion);
    }
  }, [deploymentVersion, transformDeploymentToReactFlow]);

  const validateConnection = useCallback(() => false, []);

  const handleExecuteThisVersion = useCallback(() => {
    if (!deploymentVersion?.workflowId) return;
    const workflowType = deploymentVersion.type || workflow?.type;
    if (!workflowType) return;

    executeWorkflow(
      deploymentVersion.workflowId,
      (execution) => {
        if (execution.status === "submitted") {
          toast.success("Workflow execution submitted");
        } else if (execution.status === "completed") {
          toast.success("Workflow execution completed");
        } else if (execution.status === "error") {
          toast.error("Workflow execution failed");
        } else if (execution.status === "exhausted") {
          toast.error(
            "You have run out of compute credits. Thanks for checking out the preview. The code is available at https://github.com/dafthunk-com/dafthunk."
          );
        }
      },
      nodes,
      nodeTypes,
      workflowType
    );
  }, [
    deploymentVersion?.workflowId,
    deploymentVersion?.type,
    executeWorkflow,
    nodes,
    nodeTypes,
    workflow?.type,
  ]);

  if (isDeploymentVersionLoading || isWorkflowLoading || isNodeTypesLoading) {
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

  const typeLabels: Record<WorkflowType, string> = {
    manual: "Manual",
    http_request: "HTTP Request",
    email_message: "Email Message",
    cron: "Scheduled",
  };

  const workflowType = deploymentVersion?.type || workflow?.type;

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
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground">
                  Details for this workflow deployment version
                </p>
                {workflowType && (
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[workflowType]}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExecuteThisVersion}>
                  <Play className="mr-2 h-4 w-4" />
                  Execute this Version
                </Button>
                {(deploymentVersion?.type === "http_request" ||
                  workflow?.type === "http_request") && (
                  <Button onClick={() => setIsIntegrationDialogOpen(true)}>
                    <Globe className="mr-2 h-4 w-4" />
                    Show HTTP Integration
                  </Button>
                )}
                {(deploymentVersion?.type === "email_message" ||
                  workflow?.type === "email_message") && (
                  <Button onClick={() => setIsEmailTriggerDialogOpen(true)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Show Email Trigger
                  </Button>
                )}
              </div>
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
            </TabsContent>

            <TabsContent value="workflow" className="mt-4">
              <div className="h-[calc(100vh-280px)] border rounded-md">
                {nodes.length > 0 && (
                  <WorkflowBuilder
                    workflowId={deploymentVersion.id}
                    initialNodes={nodes}
                    initialEdges={edges}
                    nodeTemplates={nodeTypes || []}
                    validateConnection={validateConnection}
                    createObjectUrl={createObjectUrl}
                    disabled={true}
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

          {(deploymentVersion?.type === "http_request" ||
            workflow?.type === "http_request") &&
            executionFormParameters.length > 0 && (
              <ExecutionFormDialog
                isOpen={isFormDialogVisible}
                onClose={closeExecutionForm}
                parameters={executionFormParameters}
                onSubmit={submitFormData}
              />
            )}
          {(deploymentVersion?.type === "http_request" ||
            workflow?.type === "http_request") &&
            executionJsonBodyParameters.length > 0 && (
              <ExecutionJsonBodyDialog
                isOpen={isJsonBodyDialogVisible}
                onClose={closeExecutionForm}
                parameters={executionJsonBodyParameters}
                onSubmit={submitJsonBody}
              />
            )}
          {(deploymentVersion?.type === "email_message" ||
            workflow?.type === "email_message") && (
            <ExecutionEmailDialog
              isOpen={isEmailFormDialogVisible}
              onClose={closeExecutionForm}
              onSubmit={submitEmailFormData}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Deployment not found</p>
        </div>
      )}
      {/* HTTP Integration Dialog */}
      {(deploymentVersion?.type === "http_request" ||
        workflow?.type === "http_request") &&
        deploymentVersion && (
          <HttpIntegrationDialog
            isOpen={isIntegrationDialogOpen}
            onClose={() => setIsIntegrationDialogOpen(false)}
            nodes={nodes}
            nodeTemplates={nodeTemplates}
            orgHandle={orgHandle}
            workflowId={deploymentVersion.workflowId}
            deploymentVersion={String(deploymentVersion.version)}
          />
        )}
      {/* Email Trigger Dialog */}
      {(deploymentVersion?.type === "email_message" ||
        workflow?.type === "email_message") &&
        deploymentVersion &&
        workflow && (
          <EmailTriggerDialog
            isOpen={isEmailTriggerDialogOpen}
            onClose={() => setIsEmailTriggerDialogOpen(false)}
            orgHandle={orgHandle}
            workflowHandle={workflow.handle}
            deploymentVersion={String(deploymentVersion.version)}
          />
        )}
    </InsetLayout>
  );
}
