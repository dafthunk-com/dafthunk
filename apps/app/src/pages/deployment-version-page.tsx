import type { DeploymentVersion, WorkflowTrigger } from "@dafthunk/types";
import type { Edge, Node } from "@xyflow/react";
import Globe from "lucide-react/icons/globe";
import Mail from "lucide-react/icons/mail";
import Play from "lucide-react/icons/play";
import { useCallback, useEffect, useState } from "react";
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
import { HttpRequestConfigDialog } from "@/components/workflow/http-request-config-dialog";
import { HttpRequestIntegrationDialog } from "@/components/workflow/http-request-integration-dialog";
import { HttpWebhookIntegrationDialog } from "@/components/workflow/http-webhook-integration-dialog";
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
    deploymentVersion?.trigger || workflow?.trigger
  );

  const {
    executeWorkflow,
    isEmailFormDialogVisible,
    isHttpRequestConfigDialogVisible,
    submitEmailFormData,
    submitHttpRequestConfig,
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
                repeated: input.repeated,
              })),
              outputs: node.outputs.map((output) => ({
                id: output.name,
                type: output.type,
                name: output.name,
                hidden: output.hidden,
                repeated: output.repeated,
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
    const workflowTrigger = deploymentVersion.trigger || workflow?.trigger;
    if (!workflowTrigger) return;

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
      workflowTrigger
    );
  }, [
    deploymentVersion?.workflowId,
    deploymentVersion?.trigger,
    executeWorkflow,
    nodes,
    nodeTypes,
    workflow?.trigger,
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

  const triggerLabels: Record<WorkflowTrigger, string> = {
    manual: "Manual",
    http_webhook: "HTTP Webhook",
    http_request: "HTTP Request",
    email_message: "Email Message",
    scheduled: "Scheduled",
    queue_message: "Queue Message",
  };

  const workflowTrigger = deploymentVersion?.trigger || workflow?.trigger;

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
                {workflowTrigger && (
                  <Badge variant="outline" className="text-xs">
                    {triggerLabels[workflowTrigger]}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExecuteThisVersion}>
                  <Play className="mr-2 h-4 w-4" />
                  Execute this Version
                </Button>
                {(deploymentVersion?.trigger === "http_request" ||
                  workflow?.trigger === "http_request") && (
                  <Button onClick={() => setIsIntegrationDialogOpen(true)}>
                    <Globe className="mr-2 h-4 w-4" />
                    Show HTTP Integration
                  </Button>
                )}
                {(deploymentVersion?.trigger === "email_message" ||
                  workflow?.trigger === "email_message") && (
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
                    nodeTypes={nodeTypes || []}
                    validateConnection={validateConnection}
                    createObjectUrl={createObjectUrl}
                    disabledWorkflow={true}
                    orgHandle={orgHandle}
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

          {(deploymentVersion?.trigger === "email_message" ||
            workflow?.trigger === "email_message") && (
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
      {/* HTTP Webhook Integration Dialog */}
      {(deploymentVersion?.trigger === "http_webhook" ||
        workflow?.trigger === "http_webhook") &&
        deploymentVersion && (
          <HttpWebhookIntegrationDialog
            isOpen={isIntegrationDialogOpen}
            onClose={() => setIsIntegrationDialogOpen(false)}
            nodes={nodes}
            nodeTypes={nodeTypes || []}
            orgHandle={orgHandle}
            workflowId={deploymentVersion.workflowId}
            deploymentVersion={String(deploymentVersion.version)}
          />
        )}
      {/* HTTP Request Integration Dialog */}
      {(deploymentVersion?.trigger === "http_request" ||
        workflow?.trigger === "http_request") &&
        deploymentVersion && (
          <HttpRequestIntegrationDialog
            isOpen={isIntegrationDialogOpen}
            onClose={() => setIsIntegrationDialogOpen(false)}
            nodes={nodes}
            nodeTypes={nodeTypes || []}
            orgHandle={orgHandle}
            workflowId={deploymentVersion.workflowId}
            deploymentVersion={String(deploymentVersion.version)}
          />
        )}
      {/* Email Trigger Dialog */}
      {(deploymentVersion?.trigger === "email_message" ||
        workflow?.trigger === "email_message") &&
        deploymentVersion && (
          <EmailTriggerDialog
            isOpen={isEmailTriggerDialogOpen}
            onClose={() => setIsEmailTriggerDialogOpen(false)}
            workflowId={deploymentVersion.workflowId}
          />
        )}

      {/* HTTP Request Config Dialog - for execution */}
      {(deploymentVersion?.trigger === "http_request" ||
        deploymentVersion?.trigger === "http_webhook" ||
        workflow?.trigger === "http_request" ||
        workflow?.trigger === "http_webhook") && (
        <HttpRequestConfigDialog
          isOpen={isHttpRequestConfigDialogVisible}
          onClose={closeExecutionForm}
          onSubmit={submitHttpRequestConfig}
        />
      )}
    </InsetLayout>
  );
}
