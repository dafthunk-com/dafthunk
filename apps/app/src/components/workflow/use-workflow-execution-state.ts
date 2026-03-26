import type { WorkflowTrigger } from "@dafthunk/types";
import type { Node as ReactFlowNode } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { EmailData } from "@/components/workflow/execution-email-dialog";
import type { HttpRequestConfig } from "@/components/workflow/http-request-config-dialog";
import { useWorkflowExecution } from "@/services/workflow-service";

import type {
  NodeExecutionState,
  NodeExecutionUpdate,
  NodeType,
  WorkflowExecution,
  WorkflowExecutionStatus,
  WorkflowNodeType,
  WorkflowParameter,
} from "./workflow-types";

interface PendingHumanInput {
  nodeId: string;
  prompt: string;
  context?: string;
  inputType: string;
}

interface UseWorkflowExecutionStateProps {
  workflowId: string;
  workflowTrigger?: WorkflowTrigger;
  orgId: string;
  nodes: ReactFlowNode<WorkflowNodeType>[];
  nodeTypes: NodeType[];
  initialWorkflowExecution?: WorkflowExecution;
  executeWorkflow?: (
    workflowId: string,
    onExecution: (execution: WorkflowExecution) => void,
    triggerData?: unknown
  ) => void | (() => void | Promise<void>);
  wsExecuteWorkflow?: (options?: {
    parameters?: Record<string, unknown>;
  }) => void;
  sendHumanInput?: (
    executionId: string,
    nodeId: string,
    response: {
      text?: string;
      approved?: boolean;
      metadata?: Record<string, unknown>;
    }
  ) => void;
  updateNodeExecution: (nodeId: string, update: NodeExecutionUpdate) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  deselectAll: () => void;
}

interface UseWorkflowExecutionStateReturn {
  workflowStatus: WorkflowExecutionStatus;
  workflowErrorMessage?: string;
  currentExecutionId?: string;
  errorDialogOpen: boolean;
  setErrorDialogOpen: (open: boolean) => void;
  handleActionButtonClick: (e: React.MouseEvent) => void;
  isEmailFormDialogVisible: boolean;
  isHttpRequestConfigDialogVisible: boolean;
  submitHttpRequestConfig: (data: HttpRequestConfig) => void;
  submitEmailFormData: (data: EmailData) => void;
  closeExecutionForm: () => void;
  executeRef: React.RefObject<((triggerData?: unknown) => void) | null>;
  pendingHumanInput: PendingHumanInput | null;
  submitHumanInput: (response: { text?: string; approved?: boolean }) => void;
  dismissHumanInput: () => void;
}

// Apply initial execution state to nodes
function applyInitialExecution(
  execution: WorkflowExecution,
  nodes: ReactFlowNode<WorkflowNodeType>[],
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeType>) => void
) {
  execution.nodeExecutions.forEach((nodeExec) => {
    const node = nodes.find((n) => n.id === nodeExec.nodeId);
    if (!node) return;

    const updatedOutputs = node.data.outputs.map((output) => {
      const outputValue =
        nodeExec.outputs?.[output.id] ?? nodeExec.outputs?.[output.name];
      return { ...output, value: outputValue } as WorkflowParameter;
    });

    const executionState =
      nodeExec.status === "idle" &&
      updatedOutputs.some((o) => o.value !== undefined)
        ? "completed"
        : nodeExec.status;

    updateNodeData(nodeExec.nodeId, {
      outputs: updatedOutputs,
      executionState,
      error: nodeExec.error,
    });
  });
}

export function useWorkflowExecutionState({
  workflowId,
  workflowTrigger,
  orgId,
  nodes,
  nodeTypes,
  initialWorkflowExecution,
  executeWorkflow,
  wsExecuteWorkflow,
  sendHumanInput,
  updateNodeExecution,
  updateNodeData,
  deselectAll,
}: UseWorkflowExecutionStateProps): UseWorkflowExecutionStateReturn {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowExecutionStatus>(
    initialWorkflowExecution?.status || "idle"
  );
  const statusRef = useRef<WorkflowExecutionStatus>(
    initialWorkflowExecution?.status || "idle"
  );
  const [workflowErrorMessage, setWorkflowErrorMessage] = useState<
    string | undefined
  >(initialWorkflowExecution?.error);
  const [errorDialogOpen, setErrorDialogOpen] = useState(
    initialWorkflowExecution?.status === "exhausted"
  );
  const [currentExecutionId, setCurrentExecutionId] = useState<
    string | undefined
  >(initialWorkflowExecution?.id);

  const [pendingHumanInput, setPendingHumanInput] =
    useState<PendingHumanInput | null>(null);

  const cleanupRef = useRef<(() => void | Promise<void>) | null>(null);
  const initializedRef = useRef(false);
  const executeRef = useRef<((triggerData?: unknown) => void) | null>(null);
  const executionCallbackRef = useRef<
    ((execution: WorkflowExecution) => void) | null
  >(null);

  // WebSocket execution wrapper
  const wsExecuteWorkflowWrapper = useCallback(
    (options?: { parameters?: Record<string, unknown> }) => {
      if (executeWorkflow && executionCallbackRef.current) {
        executeWorkflow(
          workflowId,
          executionCallbackRef.current,
          options?.parameters
        );
      } else if (wsExecuteWorkflow) {
        wsExecuteWorkflow(options);
      }
    },
    [executeWorkflow, wsExecuteWorkflow, workflowId]
  );

  // Execution form dialogs
  const {
    executeWorkflow: executeWorkflowWithForm,
    isEmailFormDialogVisible,
    isHttpRequestConfigDialogVisible,
    submitHttpRequestConfig,
    submitEmailFormData,
    closeExecutionForm,
  } = useWorkflowExecution(orgId, wsExecuteWorkflowWrapper);

  // Apply initial execution state once
  useEffect(() => {
    if (
      initialWorkflowExecution &&
      !initializedRef.current &&
      nodes.length > 0
    ) {
      initializedRef.current = true;
      statusRef.current = initialWorkflowExecution.status;
      setWorkflowStatus(initialWorkflowExecution.status);
      applyInitialExecution(initialWorkflowExecution, nodes, updateNodeData);

      if (initialWorkflowExecution.status === "exhausted") {
        setErrorDialogOpen(true);
      }
    }
  }, [initialWorkflowExecution, nodes, updateNodeData]);

  const resetNodeStates = useCallback(
    (state: NodeExecutionState = "idle") => {
      nodes.forEach((node) => {
        updateNodeExecution(node.id, {
          state,
          outputs: {},
          error: undefined,
        });
      });
      setWorkflowErrorMessage(undefined);
    },
    [nodes, updateNodeExecution]
  );

  // Unified execution callback factory — eliminates the two duplicate closures
  const createExecutionCallback = useCallback(
    (eagerStart: boolean) => {
      return (execution: WorkflowExecution) => {
        if (execution.id) {
          setCurrentExecutionId(execution.id);
        }

        // Once cancelled by the user, ignore late server callbacks
        if (statusRef.current === "cancelled") {
          return;
        }

        // Check if we need to reset node states before updating status
        // (must happen outside the state updater to avoid side effects)
        if (!eagerStart && statusRef.current === "idle") {
          resetNodeStates("executing");
        }

        setWorkflowStatus((currentStatus) => {
          let newStatus: WorkflowExecutionStatus;
          if (eagerStart) {
            // handleExecute path: already set to "executing", ignore "submitted" echoes
            if (
              currentStatus === "executing" &&
              execution.status === "submitted"
            ) {
              newStatus = currentStatus;
            } else {
              newStatus = execution.status;
            }
          } else {
            // handleExecuteRequest path: wait for first real callback
            if (currentStatus === "idle") {
              newStatus = "executing";
            } else if (
              currentStatus === "executing" &&
              execution.status === "submitted"
            ) {
              newStatus = currentStatus;
            } else {
              newStatus = execution.status;
            }
          }
          statusRef.current = newStatus;
          return newStatus;
        });

        setWorkflowErrorMessage(execution.error);

        execution.nodeExecutions.forEach((nodeExecution) => {
          updateNodeExecution(nodeExecution.nodeId, {
            state: nodeExecution.status,
            outputs: nodeExecution.outputs || {},
            error: nodeExecution.error,
          });

          // Detect pending human-input nodes
          if (
            nodeExecution.status === "pending" &&
            nodeExecution.pendingEvent?.type?.startsWith("human-input-")
          ) {
            const node = nodes.find((n) => n.id === nodeExecution.nodeId);
            const prompt = node?.data.inputs.find((i) => i.id === "prompt")
              ?.value as string | undefined;
            const context = node?.data.inputs.find((i) => i.id === "context")
              ?.value as string | undefined;
            const inputType =
              (node?.data.inputs.find((i) => i.id === "input_type")?.value as
                | string
                | undefined) ?? "text";

            setPendingHumanInput({
              nodeId: nodeExecution.nodeId,
              prompt: prompt || "Input required",
              context,
              inputType,
            });
          }
        });

        if (execution.status === "exhausted") {
          setErrorDialogOpen(true);
        }
      };
    },
    [resetNodeStates, updateNodeExecution, nodes]
  );

  const handleExecuteRequest = useCallback(
    (execute: (triggerData?: unknown) => void) => {
      if (
        !workflowTrigger ||
        workflowTrigger === "manual" ||
        workflowTrigger === "scheduled" ||
        workflowTrigger === "queue_message"
      ) {
        execute(undefined);
        return;
      }

      executeRef.current = execute;

      const executionCallback = createExecutionCallback(false);
      executionCallbackRef.current = executionCallback;

      if (workflowId) {
        executeWorkflowWithForm(
          workflowId,
          executionCallback,
          nodes,
          nodeTypes,
          workflowTrigger
        );
      }
    },
    [
      workflowTrigger,
      workflowId,
      executeWorkflowWithForm,
      nodes,
      nodeTypes,
      createExecutionCallback,
    ]
  );

  const handleExecute = useCallback(
    (triggerData?: unknown) => {
      if (!executeWorkflow) return null;

      resetNodeStates("executing");
      statusRef.current = "executing";
      setWorkflowStatus("executing");

      const executionCallback = createExecutionCallback(true);
      executionCallbackRef.current = executionCallback;

      return executeWorkflow(workflowId, executionCallback, triggerData);
    },
    [executeWorkflow, workflowId, resetNodeStates, createExecutionCallback]
  );

  const startExecution = useCallback(() => {
    deselectAll();

    handleExecuteRequest((triggerData) => {
      const cleanup = handleExecute(triggerData);
      if (cleanup) cleanupRef.current = cleanup;
    });
  }, [deselectAll, handleExecute, handleExecuteRequest]);

  const handleActionButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (workflowStatus === "idle") {
        startExecution();
      } else if (
        workflowStatus === "submitted" ||
        workflowStatus === "executing"
      ) {
        deselectAll();
        if (cleanupRef.current) {
          Promise.resolve(cleanupRef.current()).catch((error) =>
            console.error("Error during cleanup:", error)
          );
          cleanupRef.current = null;
        }
        statusRef.current = "cancelled";
        setWorkflowStatus("cancelled");
      } else {
        deselectAll();
        resetNodeStates();
        statusRef.current = "idle";
        setWorkflowStatus("idle");
      }
    },
    [workflowStatus, resetNodeStates, startExecution, deselectAll]
  );

  const submitHumanInput = useCallback(
    (response: { text?: string; approved?: boolean }) => {
      if (!pendingHumanInput || !currentExecutionId || !sendHumanInput) return;
      sendHumanInput(currentExecutionId, pendingHumanInput.nodeId, response);
      setPendingHumanInput(null);
    },
    [pendingHumanInput, currentExecutionId, sendHumanInput]
  );

  const dismissHumanInput = useCallback(() => {
    setPendingHumanInput(null);
  }, []);

  return {
    workflowStatus,
    workflowErrorMessage,
    currentExecutionId,
    errorDialogOpen,
    setErrorDialogOpen,
    handleActionButtonClick,
    isEmailFormDialogVisible,
    isHttpRequestConfigDialogVisible,
    submitHttpRequestConfig,
    submitEmailFormData,
    closeExecutionForm,
    executeRef,
    pendingHumanInput,
    submitHumanInput,
    dismissHumanInput,
  };
}
