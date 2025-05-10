import { useCallback, useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { WorkflowExecution as BackendWorkflowExecution } from "@dafthunk/types";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type { Connection, Node, Edge } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import type {
  WorkflowExecutionStatus,
  WorkflowExecution,
  NodeExecutionState,
  WorkflowNodeType,
  WorkflowEdgeType,
} from "@/components/workflow/workflow-types.tsx";
import { WorkflowError } from "@/components/workflow/workflow-error";
import { API_BASE_URL } from "@/config/api";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { toast } from "sonner";
import { useWorkflowDetails } from "@/hooks/use-fetch";
import { InsetLoading } from "@/components/inset-loading";
import { useNodeTemplates } from "@/hooks/use-node-templates";
import { useEditableWorkflow } from "@/hooks/use-editable-workflow";
import {
  ExecutionFormDialog,
  type DialogFormParameter,
} from "@/components/workflow/execution-form-dialog";
import { extractDialogParametersFromNodes } from "@/utils/utils";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { nodeTemplates, isLoadingTemplates, templatesError } =
    useNodeTemplates();

  const {
    workflowDetails: currentWorkflow,
    workflowDetailsError,
    isWorkflowDetailsLoading,
  } = useWorkflowDetails(id!);

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

  const [showExecutionForm, setShowExecutionForm] = useState(false);
  const [formParameters, setFormParameters] = useState<DialogFormParameter[]>(
    []
  );
  const executionContextRef = useRef<{
    workflowId: string;
    onExecution: (execution: WorkflowExecution) => void;
  } | null>(null);
  const activeEditorPageCleanupRef = useRef<(() => void) | null>(null);

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

  const performExecutionAndPoll = useCallback(
    (
      workflowId: string,
      onExecution: (execution: WorkflowExecution) => void,
      requestBody?: Record<string, any>
    ) => {
      console.log(
        `Starting workflow execution for ID: ${workflowId} with body:`,
        requestBody
      );

      const requestOptions: RequestInit = {
        method: "POST",
        credentials: "include",
      };

      if (requestBody && Object.keys(requestBody).length > 0) {
        requestOptions.headers = { "Content-Type": "application/json" };
        requestOptions.body = JSON.stringify(requestBody);
      }

      const executeUrl = new URL(
        `${API_BASE_URL}/workflows/${workflowId}/execute`
      );
      executeUrl.searchParams.append("monitorProgress", "true");

      let pollingIntervalId: NodeJS.Timeout | undefined = undefined;
      let cancelled = false;

      fetch(executeUrl.toString(), requestOptions)
        .then(async (response) => {
          if (cancelled) return;
          if (!response.ok) {
            let errorMessage = `Failed to start workflow execution. Status: ${response.status}`;
            try {
              const errData = await response.json();
              errorMessage = errData.message || errorMessage;
            } catch (jsonError) {
              console.warn("Could not parse error response JSON:", jsonError);
            }
            throw new Error(errorMessage);
          }
          return response.json();
        })
        .then(async (initialExecution: BackendWorkflowExecution) => {
          if (cancelled) return;
          const executionId = initialExecution.id;

          const updateExecutionState = (exec: BackendWorkflowExecution) => {
            onExecution({
              status: exec.status as WorkflowExecutionStatus,
              nodeExecutions: exec.nodeExecutions.map((ne) => ({
                nodeId: ne.nodeId,
                status: ne.status as NodeExecutionState,
                outputs: ne.outputs || {},
                error: ne.error,
              })),
            });
          };

          updateExecutionState(initialExecution);

          if (
            initialExecution.status === "completed" ||
            initialExecution.status === "error"
          ) {
            return;
          }

          pollingIntervalId = setInterval(async () => {
            if (cancelled) {
              clearInterval(pollingIntervalId);
              return;
            }
            try {
              const statusResponse = await fetch(
                `${API_BASE_URL}/executions/${executionId}`,
                {
                  credentials: "include",
                }
              );
              if (cancelled) {
                clearInterval(pollingIntervalId);
                return;
              }
              if (statusResponse.status === 404) {
                console.warn(
                  `Execution ${executionId} not found during polling. Stopping poll.`
                );
                clearInterval(pollingIntervalId);
                return;
              }
              if (!statusResponse.ok) {
                let errorMessage = `Failed to fetch execution status. Status: ${statusResponse.status}`;
                try {
                  const errorData = await statusResponse.json();
                  errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                  console.warn(
                    "Could not parse status error response JSON:",
                    jsonError
                  );
                }
                throw new Error(errorMessage);
              }
              const execution =
                (await statusResponse.json()) as BackendWorkflowExecution;
              updateExecutionState(execution);

              if (
                execution.status === "completed" ||
                execution.status === "error"
              ) {
                clearInterval(pollingIntervalId);
              }
            } catch (error) {
              console.error("Error polling execution status:", error);
              clearInterval(pollingIntervalId);
              onExecution({
                status: "error",
                nodeExecutions: [],
                error:
                  error instanceof Error ? error.message : "Polling failed",
              });
            }
          }, 1000);
        })
        .catch((error) => {
          if (cancelled) return;
          console.error(
            "Error starting or processing workflow execution:",
            error
          );
          onExecution({
            status: "error",
            nodeExecutions: [],
            error: error instanceof Error ? error.message : "Failed to execute",
          });
        });

      return () => {
        cancelled = true;
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
        }
        console.log(
          `Client-side polling cleanup called for workflow ID: ${workflowId}.`
        );
      };
    },
    []
  );

  const executeWorkflowWrapper = useCallback(
    (
      workflowIdFromBuilder: string,
      onExecutionFromBuilder: (execution: WorkflowExecution) => void
    ) => {
      if (activeEditorPageCleanupRef.current) {
        activeEditorPageCleanupRef.current();
        activeEditorPageCleanupRef.current = null;
      }

      const httpParameterNodes = extractDialogParametersFromNodes(
        latestUiNodes,
        nodeTemplates
      );

      if (httpParameterNodes.length > 0) {
        setFormParameters(httpParameterNodes);
        setShowExecutionForm(true);
        executionContextRef.current = {
          workflowId: workflowIdFromBuilder,
          onExecution: onExecutionFromBuilder,
        };
        activeEditorPageCleanupRef.current = null;
        return undefined;
      } else {
        const cleanup = performExecutionAndPoll(
          workflowIdFromBuilder,
          onExecutionFromBuilder
        );
        activeEditorPageCleanupRef.current = cleanup;
        return cleanup;
      }
    },
    [
      latestUiNodes,
      nodeTemplates,
      performExecutionAndPoll,
      activeEditorPageCleanupRef,
    ]
  );

  const handleRetryLoading = () => {
    if (id) {
      navigate(0);
    }
  };

  const handleDeployWorkflow = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!id) return;
      import("@/services/workflowService").then((module) => {
        module.workflowService
          .deploy(id)
          .then(() => {
            toast.success("Workflow deployed successfully");
          })
          .catch((error) => {
            console.error("Error deploying workflow:", error);
            toast.error("Failed to deploy workflow. Please try again.");
          });
      });
    },
    [id]
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

  if (templatesError) {
    return (
      <WorkflowError
        message={templatesError}
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
    isLoadingTemplates ||
    isWorkflowInitializing
  ) {
    return <InsetLoading />;
  }

  if (
    !currentWorkflow &&
    !isWorkflowDetailsLoading &&
    !workflowDetailsError &&
    !isLoadingTemplates &&
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
            executeWorkflow={executeWorkflowWrapper}
            onDeployWorkflow={handleDeployWorkflow}
          />
        </div>
        {showExecutionForm && (
          <ExecutionFormDialog
            isOpen={showExecutionForm}
            onClose={() => setShowExecutionForm(false)}
            parameters={formParameters}
            onSubmit={(formData) => {
              setShowExecutionForm(false);
              if (executionContextRef.current) {
                const { workflowId: execWfId, onExecution } =
                  executionContextRef.current;
                const cleanup = performExecutionAndPoll(
                  execWfId,
                  onExecution,
                  formData
                );
                activeEditorPageCleanupRef.current = cleanup;
              }
            }}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
