import type { WorkflowType } from "@dafthunk/types";
import type { Connection, Edge, Node } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetLoading } from "@/components/inset-loading";
import { EmailTriggerDialog } from "@/components/workflow/email-trigger-dialog";
import { ExecutionEmailDialog } from "@/components/workflow/execution-email-dialog";
import { ExecutionFormDialog } from "@/components/workflow/execution-form-dialog";
import { ExecutionJsonBodyDialog } from "@/components/workflow/execution-json-body-dialog";
import { HttpIntegrationDialog } from "@/components/workflow/http-integration-dialog";
import {
  type CronFormData,
  SetCronDialog,
} from "@/components/workflow/set-cron-dialog";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { WorkflowError } from "@/components/workflow/workflow-error";
import type {
  NodeTemplate,
  WorkflowEdgeType,
  WorkflowExecution,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import { useEditableWorkflow } from "@/hooks/use-editable-workflow";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createDeployment,
  useDeploymentHistory,
} from "@/services/deployment-service";
import { useObjectService } from "@/services/object-service";
import { useNodeTypes } from "@/services/type-service";
import {
  upsertCronTrigger,
  useCronTrigger,
  useWorkflowExecution,
} from "@/services/workflow-service";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";
  const { getOrgUrl } = useOrgUrl();

  const [workflowBuilderKey, setWorkflowBuilderKey] = useState(Date.now());

  const [isSetCronDialogOpen, setIsSetCronDialogOpen] = useState(false);
  const [isHttpIntegrationDialogOpen, setIsHttpIntegrationDialogOpen] =
    useState(false);
  const [isEmailTriggerDialogOpen, setIsEmailTriggerDialogOpen] =
    useState(false);

  // Fetch all node types initially (no filter)
  const { nodeTypes, nodeTypesError, isNodeTypesLoading } = useNodeTypes(
    undefined, // Fetch all node types initially
    { revalidateOnFocus: false }
  );

  const { createObjectUrl } = useObjectService();

  const nodeTemplates: NodeTemplate[] = useMemo(() => {
    const templates =
      nodeTypes?.map((type) => ({
        id: type.id,
        type: type.id,
        name: type.name,
        description: type.description || "",
        tags: type.tags,
        icon: type.icon,
        functionCalling: type.functionCalling,
        asTool: type.asTool,
        inputs: type.inputs.map((input) => ({
          id: input.name, // Assuming name is unique identifier for input/output handles
          type: input.type,
          name: input.name,
          hidden: input.hidden,
          required: input.required,
          repeated: input.repeated,
        })),
        outputs: type.outputs.map((output) => ({
          id: output.name, // Assuming name is unique identifier for input/output handles
          type: output.type,
          name: output.name,
          hidden: output.hidden,
          required: output.required,
          repeated: output.repeated,
        })),
      })) || [];

    return templates;
  }, [nodeTypes]);

  // Get workflow metadata from WebSocket connection
  const {
    nodes: initialNodesForUI,
    edges: initialEdgesForUI,
    isInitializing: isWorkflowInitializing,
    processingError: workflowProcessingError,
    savingError: workflowSavingError,
    saveWorkflow,
    isWSConnected: _isWSConnected,
    workflowMetadata,
  } = useEditableWorkflow({
    workflowId: id,
    nodeTemplates,
  });

  // Now we can use workflowMetadata for cron trigger
  const { cronTrigger, isCronTriggerLoading, mutateCronTrigger } =
    useCronTrigger(workflowMetadata?.type === "cron" && id ? id : null, {
      revalidateOnFocus: false,
    });

  const {
    deployments: deploymentHistory,
    isDeploymentHistoryLoading,
    mutateHistory: mutateDeploymentHistory,
  } = useDeploymentHistory(id!, { revalidateOnFocus: false });

  const deploymentVersions = useMemo(
    () => deploymentHistory.map((d) => d.version).sort((a, b) => b - a),
    [deploymentHistory]
  );

  const [latestUiNodes, setLatestUiNodes] = useState<Node<WorkflowNodeType>[]>(
    []
  );
  const [latestUiEdges, setLatestUiEdges] = useState<Edge<WorkflowEdgeType>[]>(
    []
  );

  // Use refs to always have the latest values without causing callback recreation
  const latestUiNodesRef = useRef<Node<WorkflowNodeType>[]>([]);
  const latestUiEdgesRef = useRef<Edge<WorkflowEdgeType>[]>([]);

  const handleOpenSetCronDialog = useCallback(() => {
    mutateDeploymentHistory();
    mutateCronTrigger();
    setIsSetCronDialogOpen(true);
  }, [mutateDeploymentHistory, mutateCronTrigger]);

  const handleCloseSetCronDialog = useCallback(() => {
    setIsSetCronDialogOpen(false);
  }, []);

  const handleSaveCron = useCallback(
    async (data: CronFormData) => {
      if (!id || !orgHandle) return;
      try {
        const updatedCron = await upsertCronTrigger(id, orgHandle, {
          cronExpression: data.cronExpression,
          active: data.active,
          versionAlias: data.versionAlias,
          versionNumber: data.versionNumber,
        });
        mutateCronTrigger(updatedCron);
        toast.success("Cron schedule saved successfully.");
        setIsSetCronDialogOpen(false);
      } catch (error) {
        console.error("Failed to save cron schedule:", error);
        toast.error("Failed to save cron schedule. Please try again.");
      }
    },
    [id, orgHandle, mutateCronTrigger]
  );

  useEffect(() => {
    if (initialNodesForUI) {
      setLatestUiNodes(initialNodesForUI);
      latestUiNodesRef.current = initialNodesForUI;
    }
  }, [initialNodesForUI]);

  useEffect(() => {
    if (initialEdgesForUI) {
      setLatestUiEdges(initialEdgesForUI);
      latestUiEdgesRef.current = initialEdgesForUI;
    }
  }, [initialEdgesForUI]);

  const handleUiNodesChanged = useCallback(
    (updatedNodesFromUI: Node<WorkflowNodeType>[]) => {
      setLatestUiNodes(updatedNodesFromUI);
      latestUiNodesRef.current = updatedNodesFromUI;
      if (workflowMetadata) {
        saveWorkflow(updatedNodesFromUI, latestUiEdgesRef.current);
      }
    },
    [saveWorkflow, workflowMetadata]
  );

  const handleUiEdgesChanged = useCallback(
    (updatedEdgesFromUI: Edge<WorkflowEdgeType>[]) => {
      setLatestUiEdges(updatedEdgesFromUI);
      latestUiEdgesRef.current = updatedEdgesFromUI;
      if (workflowMetadata) {
        saveWorkflow(latestUiNodesRef.current, updatedEdgesFromUI);
      }
    },
    [saveWorkflow, workflowMetadata]
  );

  const {
    executeWorkflow,
    isFormDialogVisible,
    isJsonBodyDialogVisible,
    executionFormParameters,
    executionJsonBodyParameters,
    submitFormData,
    submitJsonBody,
    closeExecutionForm,
    isEmailFormDialogVisible,
    submitEmailFormData,
  } = useWorkflowExecution(orgHandle);

  usePageBreadcrumbs(
    [
      { label: "Workflows", to: getOrgUrl("workflows") },
      { label: workflowMetadata?.name || "Workflow" },
    ],
    [workflowMetadata?.name]
  );

  const validateConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = latestUiNodes.find(
        (node) => node.id === connection.source
      );
      const targetNode = latestUiNodes.find(
        (node) => node.id === connection.target
      );
      if (!sourceNode || !targetNode) return false;

      const sourceOutput = sourceNode.data.outputs.find(
        (output) => output.id === connection.sourceHandle
      );
      const targetInput = targetNode.data.inputs.find(
        (input) => input.id === connection.targetHandle
      );
      if (!sourceOutput || !targetInput) return false;

      const typesMatch =
        sourceOutput.type === targetInput.type ||
        sourceOutput.type === "any" ||
        targetInput.type === "any";

      return typesMatch;
    },
    [latestUiNodes]
  );

  const editorExecuteWorkflow = useCallback(
    (
      workflowIdFromBuilder: string,
      onExecutionFromBuilder: (execution: WorkflowExecution) => void
    ) => {
      return executeWorkflow(
        workflowIdFromBuilder,
        onExecutionFromBuilder,
        latestUiNodes,
        nodeTemplates as any,
        workflowMetadata?.type
      );
    },
    [executeWorkflow, latestUiNodes, nodeTemplates, workflowMetadata?.type]
  );

  const handleRetryLoading = () => {
    if (id) {
      navigate(0);
    }
  };

  const handleDeployWorkflow = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!id || !orgHandle) return;

      try {
        await createDeployment(id, orgHandle);
        toast.success("Workflow deployed successfully");
      } catch (error) {
        console.error("Error deploying workflow:", error);
        toast.error("Failed to deploy workflow. Please try again.");
      }
    },
    [id, orgHandle]
  );

  const handleDialogCancel = () => {
    closeExecutionForm();
    setWorkflowBuilderKey(Date.now());
  };

  if (nodeTypesError) {
    return (
      <WorkflowError
        message={nodeTypesError.message || "Failed to load node types."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (workflowProcessingError) {
    return (
      <WorkflowError
        message={workflowProcessingError}
        onRetry={handleRetryLoading}
      />
    );
  }

  if (workflowSavingError) {
    toast.error(`Workflow saving error: ${workflowSavingError}`);
  }

  if (
    isNodeTypesLoading ||
    isWorkflowInitializing ||
    isCronTriggerLoading ||
    isDeploymentHistoryLoading
  ) {
    return <InsetLoading />;
  }

  if (
    !workflowMetadata &&
    !isNodeTypesLoading &&
    !nodeTypesError &&
    !isWorkflowInitializing
  ) {
    return (
      <WorkflowError
        message={`Workflow with ID "${id}" not found, or could not be loaded via WebSocket.`}
        onRetry={() => navigate(getOrgUrl("workflows"))}
      />
    );
  }

  if (!initialNodesForUI || !initialEdgesForUI) {
    return <InsetLoading />;
  }

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col relative">
        <div className="h-full w-full flex-grow">
          <WorkflowBuilder
            key={workflowBuilderKey}
            workflowId={id || ""}
            workflowType={workflowMetadata?.type as WorkflowType | undefined}
            onSetSchedule={
              workflowMetadata?.type === "cron"
                ? handleOpenSetCronDialog
                : undefined
            }
            onShowHttpIntegration={
              workflowMetadata?.type === "http_request"
                ? () => setIsHttpIntegrationDialogOpen(true)
                : undefined
            }
            onShowEmailTrigger={
              workflowMetadata?.type === "email_message"
                ? () => setIsEmailTriggerDialogOpen(true)
                : undefined
            }
            initialNodes={initialNodesForUI}
            initialEdges={initialEdgesForUI}
            nodeTemplates={nodeTemplates}
            onNodesChange={handleUiNodesChanged}
            onEdgesChange={handleUiEdgesChanged}
            validateConnection={validateConnection}
            executeWorkflow={editorExecuteWorkflow}
            onDeployWorkflow={handleDeployWorkflow}
            createObjectUrl={createObjectUrl}
          />
        </div>
        {workflowMetadata?.type === "http_request" && (
          <HttpIntegrationDialog
            isOpen={isHttpIntegrationDialogOpen}
            onClose={() => setIsHttpIntegrationDialogOpen(false)}
            orgHandle={orgHandle}
            workflowId={id!}
            deploymentVersion="dev"
            nodes={latestUiNodes}
            nodeTemplates={nodeTemplates}
          />
        )}
        {workflowMetadata?.type === "http_request" &&
          executionFormParameters.length > 0 && (
            <ExecutionFormDialog
              isOpen={isFormDialogVisible}
              onClose={closeExecutionForm}
              onCancel={handleDialogCancel}
              parameters={executionFormParameters}
              onSubmit={submitFormData}
            />
          )}
        {workflowMetadata?.type === "http_request" &&
          executionJsonBodyParameters.length > 0 && (
            <ExecutionJsonBodyDialog
              isOpen={isJsonBodyDialogVisible}
              onClose={closeExecutionForm}
              onCancel={handleDialogCancel}
              parameters={executionJsonBodyParameters}
              onSubmit={submitJsonBody}
            />
          )}
        {workflowMetadata?.type === "email_message" && (
          <EmailTriggerDialog
            isOpen={isEmailTriggerDialogOpen}
            onClose={() => setIsEmailTriggerDialogOpen(false)}
            orgHandle={orgHandle}
            workflowHandle={workflowMetadata.handle}
            deploymentVersion="dev"
          />
        )}
        {workflowMetadata?.type === "email_message" && (
          <ExecutionEmailDialog
            isOpen={isEmailFormDialogVisible}
            onClose={closeExecutionForm}
            onCancel={handleDialogCancel}
            onSubmit={submitEmailFormData}
          />
        )}
        {workflowMetadata?.type === "cron" && (
          <SetCronDialog
            isOpen={isSetCronDialogOpen}
            onClose={handleCloseSetCronDialog}
            onSubmit={handleSaveCron}
            initialData={{
              cronExpression: cronTrigger?.cronExpression || "",
              active:
                cronTrigger?.active === undefined ? true : cronTrigger.active,
              versionAlias: cronTrigger?.versionAlias || "dev",
              versionNumber: cronTrigger?.versionNumber,
            }}
            deploymentVersions={deploymentVersions}
            workflowName={workflowMetadata?.name}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
