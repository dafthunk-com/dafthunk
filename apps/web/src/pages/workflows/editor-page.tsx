import type { Connection, Edge, Node } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  useWorkflow,
  useWorkflowExecution,
} from "@/services/workflow-service";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const [workflowBuilderKey, setWorkflowBuilderKey] = useState(Date.now());

  const [isSetCronDialogOpen, setIsSetCronDialogOpen] = useState(false);
  const [isHttpIntegrationDialogOpen, setIsHttpIntegrationDialogOpen] =
    useState(false);
  const [isEmailTriggerDialogOpen, setIsEmailTriggerDialogOpen] =
    useState(false);

  const {
    workflow: currentWorkflow,
    workflowError: workflowDetailsError,
    isWorkflowLoading: isWorkflowDetailsLoading,
  } = useWorkflow(id || null, { revalidateOnFocus: false });

  const { cronTrigger, isCronTriggerLoading, mutateCronTrigger } =
    useCronTrigger(currentWorkflow?.type === "cron" && id ? id : null, {
      revalidateOnFocus: false,
    });

  const {
    deployments: deploymentHistory,
    isDeploymentHistoryLoading,
    mutateHistory: mutateDeploymentHistory,
  } = useDeploymentHistory(id!, { revalidateOnFocus: false });

  const { nodeTypes, nodeTypesError, isNodeTypesLoading } = useNodeTypes(
    currentWorkflow?.type,
    { revalidateOnFocus: false }
  );

  const { createObjectUrl } = useObjectService();

  const nodeTemplates: NodeTemplate[] = useMemo(
    () => {
      const templates = nodeTypes?.map((type) => ({
        id: type.id,
        type: type.id,
        name: type.name,
        description: type.description || "",
        tags: type.tags,
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
    },
    [nodeTypes]
  );

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

  const {
    nodes: initialNodesForUI,
    edges: initialEdgesForUI,
    isInitializing: isWorkflowInitializing,
    processingError: workflowProcessingError,
    savingError: workflowSavingError,
    saveWorkflow,
  } = useEditableWorkflow({
    workflowId: id,
    currentWorkflow,
    isWorkflowDetailsLoading,
    workflowDetailsError,
  });

  useEffect(() => {
    if (initialNodesForUI) {
      setLatestUiNodes(initialNodesForUI);
    }
  }, [initialNodesForUI]);

  useEffect(() => {
    if (initialEdgesForUI) {
      setLatestUiEdges(initialEdgesForUI);
    }
  }, [initialEdgesForUI]);

  const handleUiNodesChanged = useCallback(
    (updatedNodesFromUI: Node<WorkflowNodeType>[]) => {
      setLatestUiNodes(updatedNodesFromUI);
      if (currentWorkflow) {
        saveWorkflow(updatedNodesFromUI, latestUiEdges);
      }
    },
    [latestUiEdges, saveWorkflow, currentWorkflow]
  );

  const handleUiEdgesChanged = useCallback(
    (updatedEdgesFromUI: Edge<WorkflowEdgeType>[]) => {
      setLatestUiEdges(updatedEdgesFromUI);
      if (currentWorkflow) {
        saveWorkflow(latestUiNodes, updatedEdgesFromUI);
      }
    },
    [latestUiNodes, saveWorkflow, currentWorkflow]
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
      { label: "Workflows", to: "/workflows/workflows" },
      { label: currentWorkflow?.name || "Workflow" },
    ],
    [currentWorkflow?.name]
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
      
      const typesMatch = (
        sourceOutput.type === targetInput.type ||
        sourceOutput.type === "any" ||
        targetInput.type === "any"
      );
      
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
        currentWorkflow?.type
      );
    },
    [executeWorkflow, latestUiNodes, nodeTemplates, currentWorkflow?.type]
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

  if (workflowDetailsError) {
    return (
      <WorkflowError
        message={
          workflowDetailsError.message || "Failed to load workflow details."
        }
        onRetry={handleRetryLoading}
      />
    );
  }

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
    isWorkflowDetailsLoading ||
    isNodeTypesLoading ||
    isWorkflowInitializing ||
    isCronTriggerLoading ||
    isDeploymentHistoryLoading
  ) {
    return <InsetLoading />;
  }

  if (
    !currentWorkflow &&
    !isWorkflowDetailsLoading &&
    !workflowDetailsError &&
    !isNodeTypesLoading &&
    !nodeTypesError &&
    !isWorkflowInitializing
  ) {
    return (
      <WorkflowError
        message={`Workflow with ID "${id}" not found, or could not be prepared.`}
        onRetry={() => navigate("/workflows/workflows")}
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
            workflowType={currentWorkflow?.type}
            onSetSchedule={
              currentWorkflow?.type === "cron"
                ? handleOpenSetCronDialog
                : undefined
            }
            onShowHttpIntegration={
              currentWorkflow?.type === "http_request"
                ? () => setIsHttpIntegrationDialogOpen(true)
                : undefined
            }
            onShowEmailTrigger={
              currentWorkflow?.type === "email_message"
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
        {currentWorkflow?.type === "http_request" && (
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
        {currentWorkflow?.type === "http_request" &&
          executionFormParameters.length > 0 && (
            <ExecutionFormDialog
              isOpen={isFormDialogVisible}
              onClose={closeExecutionForm}
              onCancel={handleDialogCancel}
              parameters={executionFormParameters}
              onSubmit={submitFormData}
            />
          )}
        {currentWorkflow?.type === "http_request" &&
          executionJsonBodyParameters.length > 0 && (
            <ExecutionJsonBodyDialog
              isOpen={isJsonBodyDialogVisible}
              onClose={closeExecutionForm}
              onCancel={handleDialogCancel}
              parameters={executionJsonBodyParameters}
              onSubmit={submitJsonBody}
            />
          )}
        {currentWorkflow?.type === "email_message" && (
          <EmailTriggerDialog
            isOpen={isEmailTriggerDialogOpen}
            onClose={() => setIsEmailTriggerDialogOpen(false)}
            orgHandle={orgHandle}
            workflowHandle={currentWorkflow.handle}
            deploymentVersion="dev"
          />
        )}
        {currentWorkflow?.type === "email_message" && (
          <ExecutionEmailDialog
            isOpen={isEmailFormDialogVisible}
            onClose={closeExecutionForm}
            onCancel={handleDialogCancel}
            onSubmit={submitEmailFormData}
          />
        )}
        {currentWorkflow?.type === "cron" && (
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
            workflowName={currentWorkflow?.name}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
