import type { GetCronTriggerResponse } from "@dafthunk/types";
import type { Connection, Edge, Node } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetLoading } from "@/components/inset-loading";
import { EmailDialog } from "@/components/workflow/execution-email-dialog";
import { ExecutionFormDialog } from "@/components/workflow/execution-form-dialog";
import { ExecutionJsonBodyDialog } from "@/components/workflow/execution-json-body-dialog";
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
  getCronTrigger,
  upsertCronTrigger,
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
  const [cronTriggerData, setCronTriggerData] =
    useState<GetCronTriggerResponse | null>(null);
  const [isCronLoading, setIsCronLoading] = useState(false);

  const {
    workflow: currentWorkflow,
    workflowError: workflowDetailsError,
    isWorkflowLoading: isWorkflowDetailsLoading,
  } = useWorkflow(id || null);

  const {
    deployments: deploymentHistory,
    isDeploymentHistoryLoading,
    mutateHistory: mutateDeploymentHistory,
  } = useDeploymentHistory(id!);

  const { nodeTypes, nodeTypesError, isNodeTypesLoading } = useNodeTypes(
    currentWorkflow?.type
  );

  const { createObjectUrl } = useObjectService();

  const nodeTemplates: NodeTemplate[] = useMemo(
    () =>
      nodeTypes?.map((type) => ({
        id: type.id,
        type: type.id,
        name: type.name,
        description: type.description || "",
        category: type.category,
        inputs: type.inputs.map((input) => ({
          id: input.name, // Assuming name is unique identifier for input/output handles
          type: input.type,
          name: input.name,
          hidden: input.hidden,
        })),
        outputs: type.outputs.map((output) => ({
          id: output.name, // Assuming name is unique identifier for input/output handles
          type: output.type,
          name: output.name,
          hidden: output.hidden,
        })),
      })) || [],
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

  useEffect(() => {
    if (currentWorkflow?.type === "cron" && id && orgHandle) {
      setIsCronLoading(true);
      getCronTrigger(id, orgHandle)
        .then(setCronTriggerData)
        .catch((err) => {
          console.error("Failed to fetch cron trigger data:", err);
        })
        .finally(() => setIsCronLoading(false));
    }
  }, [currentWorkflow, id, orgHandle]);

  const handleOpenSetCronDialog = useCallback(() => {
    if (currentWorkflow?.type === "cron") {
      mutateDeploymentHistory();
      setIsSetCronDialogOpen(true);
    }
  }, [currentWorkflow, mutateDeploymentHistory]);

  const handleCloseSetCronDialog = useCallback(() => {
    setIsSetCronDialogOpen(false);
  }, []);

  const handleSaveCron = useCallback(
    async (data: CronFormData) => {
      if (!id || !orgHandle) return;
      try {
        const updatedCron = await upsertCronTrigger(id, orgHandle, data);
        setCronTriggerData(updatedCron);
        toast.success("Cron schedule saved successfully.");
        setIsSetCronDialogOpen(false);
      } catch (error) {
        console.error("Failed to save cron schedule:", error);
        toast.error("Failed to save cron schedule. Please try again.");
      }
    },
    [id, orgHandle]
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
      return (
        sourceOutput.type === targetInput.type ||
        sourceOutput.type === "any" ||
        targetInput.type === "any"
      );
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
    isCronLoading ||
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
        {isFormDialogVisible && executionFormParameters.length > 0 && (
          <ExecutionFormDialog
            isOpen={isFormDialogVisible}
            onClose={closeExecutionForm}
            onCancel={handleDialogCancel}
            parameters={executionFormParameters}
            onSubmit={submitFormData}
          />
        )}
        {isJsonBodyDialogVisible && executionJsonBodyParameters.length > 0 && (
          <ExecutionJsonBodyDialog
            isOpen={isJsonBodyDialogVisible}
            onClose={closeExecutionForm}
            onCancel={handleDialogCancel}
            parameters={executionJsonBodyParameters}
            onSubmit={submitJsonBody}
          />
        )}
        {isEmailFormDialogVisible && submitEmailFormData && (
          <EmailDialog
            isOpen={isEmailFormDialogVisible}
            onClose={closeExecutionForm}
            onCancel={handleDialogCancel}
            onSubmit={submitEmailFormData}
          />
        )}
        {isSetCronDialogOpen && (
          <SetCronDialog
            isOpen={isSetCronDialogOpen}
            onClose={handleCloseSetCronDialog}
            onSubmit={handleSaveCron}
            initialData={{
              cronExpression: cronTriggerData?.cronExpression || "",
              active:
                cronTriggerData?.active === undefined
                  ? true
                  : cronTriggerData.active,
              versionAlias: cronTriggerData?.versionAlias || "dev",
            }}
            deploymentVersions={deploymentVersions}
            workflowName={currentWorkflow?.name}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
