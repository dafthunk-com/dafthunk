import { useCallback, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type { Connection, Node, Edge } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import type {
  WorkflowExecution,
  WorkflowNodeType,
  WorkflowEdgeType,
} from "@/components/workflow/workflow-types.tsx";
import { WorkflowError } from "@/components/workflow/workflow-error";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { toast } from "sonner";
import { useNodeTemplates } from "@/hooks/use-fetch";
import { useWorkflow } from "@/services/workflowService";
import { InsetLoading } from "@/components/inset-loading";
import { useEditableWorkflow } from "@/hooks/use-editable-workflow";
import { ExecutionFormDialog } from "@/components/workflow/execution-form-dialog";
import { useWorkflowExecutor } from "@/hooks/use-workflow-executor";
import { API_BASE_URL } from "@/config/api";
import { deployWorkflow } from "@/services/workflowService";
import { useAuth } from "@/components/authContext";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { nodeTemplates, isNodeTemplatesLoading, nodeTemplatesError } =
    useNodeTemplates();

  const {
    workflow: currentWorkflow,
    workflowError: workflowDetailsError,
    isWorkflowLoading: isWorkflowDetailsLoading,
  } = useWorkflow(id || null);

  const [latestUiNodes, setLatestUiNodes] = useState<Node<WorkflowNodeType>[]>(
    []
  );
  const [latestUiEdges, setLatestUiEdges] = useState<Edge<WorkflowEdgeType>[]>(
    []
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
        saveWorkflow(updatedNodesFromUI, latestUiEdges, currentWorkflow);
      }
    },
    [latestUiEdges, saveWorkflow, currentWorkflow]
  );

  const handleUiEdgesChanged = useCallback(
    (updatedEdgesFromUI: Edge<WorkflowEdgeType>[]) => {
      setLatestUiEdges(updatedEdgesFromUI);
      if (currentWorkflow) {
        saveWorkflow(latestUiNodes, updatedEdgesFromUI, currentWorkflow);
      }
    },
    [latestUiNodes, saveWorkflow, currentWorkflow]
  );

  const {
    executeWorkflow: hookExecuteWorkflow,
    isExecutionFormVisible,
    executionFormParameters,
    submitExecutionForm,
    closeExecutionForm,
  } = useWorkflowExecutor({
    executeUrlFn: (workflowId) =>
      `${API_BASE_URL}/workflows/${workflowId}/execute`,
  });

  usePageBreadcrumbs(
    [
      { label: "Playground", to: "/workflows/playground" },
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
      return hookExecuteWorkflow(
        workflowIdFromBuilder,
        onExecutionFromBuilder,
        latestUiNodes,
        nodeTemplates as any
      );
    },
    [hookExecuteWorkflow, latestUiNodes, nodeTemplates]
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
        await deployWorkflow(id, orgHandle);
        toast.success("Workflow deployed successfully");
      } catch (error) {
        console.error("Error deploying workflow:", error);
        toast.error("Failed to deploy workflow. Please try again.");
      }
    },
    [id, orgHandle]
  );

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

  if (nodeTemplatesError) {
    return (
      <WorkflowError
        message={nodeTemplatesError.message}
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
    isNodeTemplatesLoading ||
    isWorkflowInitializing
  ) {
    return <InsetLoading />;
  }

  if (
    !currentWorkflow &&
    !isWorkflowDetailsLoading &&
    !workflowDetailsError &&
    !isNodeTemplatesLoading &&
    !nodeTemplatesError &&
    !isWorkflowInitializing
  ) {
    return (
      <WorkflowError
        message={`Workflow with ID "${id}" not found, or could not be prepared.`}
        onRetry={() => navigate("/workflows/playground")}
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
            workflowId={id || ""}
            initialNodes={initialNodesForUI}
            initialEdges={initialEdgesForUI}
            nodeTemplates={nodeTemplates}
            onNodesChange={handleUiNodesChanged}
            onEdgesChange={handleUiEdgesChanged}
            validateConnection={validateConnection}
            executeWorkflow={editorExecuteWorkflow}
            onDeployWorkflow={handleDeployWorkflow}
          />
        </div>
        {isExecutionFormVisible && (
          <ExecutionFormDialog
            isOpen={isExecutionFormVisible}
            onClose={closeExecutionForm}
            parameters={executionFormParameters}
            onSubmit={(formData) => {
              submitExecutionForm(formData);
            }}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
