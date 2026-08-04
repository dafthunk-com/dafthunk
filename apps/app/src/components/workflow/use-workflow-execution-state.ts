import type { WorkflowTrigger } from "@dafthunk/types";
import type { Node as ReactFlowNode } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
} from "./workflow-types";

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
  applyNodeExecutions: (updates: NodeExecutionUpdate[]) => void;
  deselectAll: () => void;
}

interface UseWorkflowExecutionStateReturn {
  workflowStatus: WorkflowExecutionStatus;
  workflowErrorMessage?: string;
  currentExecutionId?: string;
  errorDialogOpen: boolean;
  setErrorDialogOpen: (open: boolean) => void;
  /** Run / cancel / reset, depending on the current status. */
  handleActionButtonClick: () => void;
  isEmailFormDialogVisible: boolean;
  isHttpRequestConfigDialogVisible: boolean;
  submitHttpRequestConfig: (data: HttpRequestConfig) => void;
  submitEmailFormData: (data: EmailData) => void;
  closeExecutionForm: () => void;
  executeRef: React.RefObject<((triggerData?: unknown) => void) | null>;
  /** "preflight" = blocked before execution; "post-failure" = surfaced after failure. */
  /** Subscription-gated node types that triggered the upgrade prompt. */
}

/**
 * Translate a stored execution into node updates.
 *
 * A node reported as "idle" that nevertheless carries output values comes from
 * a finished run whose per-node status was never written back; treat it as
 * completed so the canvas doesn't show a blank node next to real output.
 */
export function toNodeExecutionUpdates(
  execution: WorkflowExecution,
  nodes: ReactFlowNode<WorkflowNodeType>[]
): NodeExecutionUpdate[] {
  const nodeIds = new Set(nodes.map((node) => node.id));

  return execution.nodeExecutions
    .filter((nodeExec) => nodeIds.has(nodeExec.nodeId))
    .map((nodeExec) => {
      const outputs = nodeExec.outputs ?? {};
      const hasOutputValues = Object.values(outputs).some(
        (value) => value !== undefined
      );

      return {
        nodeId: nodeExec.nodeId,
        state:
          nodeExec.status === "idle" && hasOutputValues
            ? ("completed" as NodeExecutionState)
            : nodeExec.status,
        outputs,
        error: nodeExec.error,
      };
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
  applyNodeExecutions,
  deselectAll,
}: UseWorkflowExecutionStateProps): UseWorkflowExecutionStateReturn {
  const [workflowStatus, setWorkflowStatusState] =
    useState<WorkflowExecutionStatus>(
      initialWorkflowExecution?.status || "idle"
    );

  // The status is read by callbacks that outlive the render which created them
  // (execution callbacks stored in a ref), so it needs a ref as well as state.
  // This setter is the only writer of either — keeping them in lockstep here
  // rather than at each call site, and keeping the ref write out of a setState
  // updater, where StrictMode would run it twice.
  const statusRef = useRef<WorkflowExecutionStatus>(workflowStatus);
  const setWorkflowStatus = useCallback((next: WorkflowExecutionStatus) => {
    statusRef.current = next;
    setWorkflowStatusState(next);
  }, []);
  const [workflowErrorMessage, setWorkflowErrorMessage] = useState<
    string | undefined
  >(initialWorkflowExecution?.error);
  const [errorDialogOpen, setErrorDialogOpen] = useState(
    initialWorkflowExecution?.status === "exhausted"
  );
  const [currentExecutionId, setCurrentExecutionId] = useState<
    string | undefined
  >(initialWorkflowExecution?.id);

  const cleanupRef = useRef<(() => void | Promise<void>) | null>(null);
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
    cancelWorkflowExecution,
    isEmailFormDialogVisible,
    isHttpRequestConfigDialogVisible,
    submitHttpRequestConfig,
    submitEmailFormData,
    closeExecutionForm,
  } = useWorkflowExecution(orgId, wsExecuteWorkflowWrapper);

  // Executions pushed from the backend (scheduled runs, webhooks) arrive as a
  // changing prop. Apply each one exactly once, keyed on the execution object
  // itself — a boolean latch would drop every run after the first.
  //
  // `nodes` is read through a ref because applying an execution rewrites node
  // data: depending on the array here would re-trigger this effect forever.
  // `nodes.length` is a safe dependency (applying an execution never changes
  // the count) and covers an execution arriving before the graph has loaded.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const appliedExecutionRef = useRef<WorkflowExecution | null>(null);

  useEffect(() => {
    if (!initialWorkflowExecution) return;
    if (appliedExecutionRef.current === initialWorkflowExecution) return;
    if (nodesRef.current.length === 0) return;

    appliedExecutionRef.current = initialWorkflowExecution;
    setWorkflowStatus(initialWorkflowExecution.status);
    applyNodeExecutions(
      toNodeExecutionUpdates(initialWorkflowExecution, nodesRef.current)
    );

    if (initialWorkflowExecution.status === "exhausted") {
      setErrorDialogOpen(true);
    }
  }, [
    initialWorkflowExecution,
    nodes.length,
    applyNodeExecutions,
    setWorkflowStatus,
  ]);

  const resetNodeStates = useCallback(
    (state: NodeExecutionState = "idle") => {
      applyNodeExecutions(
        nodesRef.current.map((node) => ({
          nodeId: node.id,
          state,
          outputs: {},
          error: undefined,
        }))
      );
      setWorkflowErrorMessage(undefined);
    },
    [applyNodeExecutions]
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

        const currentStatus = statusRef.current;
        let newStatus: WorkflowExecutionStatus;
        if (!eagerStart && currentStatus === "idle") {
          // handleExecuteRequest path: wait for the first real callback
          newStatus = "executing";
        } else if (
          currentStatus === "executing" &&
          execution.status === "submitted"
        ) {
          // Already running locally — ignore a late "submitted" echo
          newStatus = currentStatus;
        } else {
          newStatus = execution.status;
        }
        setWorkflowStatus(newStatus);

        setWorkflowErrorMessage(execution.error);

        applyNodeExecutions(
          execution.nodeExecutions.map((nodeExecution) => ({
            nodeId: nodeExecution.nodeId,
            state: nodeExecution.status,
            outputs: nodeExecution.outputs || {},
            error: nodeExecution.error,
          }))
        );

        if (execution.status === "exhausted") {
          setErrorDialogOpen(true);
        }
      };
    },
    [resetNodeStates, applyNodeExecutions, setWorkflowStatus]
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
      setWorkflowStatus("executing");

      const executionCallback = createExecutionCallback(true);
      executionCallbackRef.current = executionCallback;

      return executeWorkflow(workflowId, executionCallback, triggerData);
    },
    [
      executeWorkflow,
      workflowId,
      resetNodeStates,
      createExecutionCallback,
      setWorkflowStatus,
    ]
  );

  /**
   * Stop a run that is in flight.
   *
   * Detaching the local callback only stops the canvas from updating — the run
   * keeps going, and keeps consuming compute. So terminate it server-side too,
   * and report it honestly when that fails: a run that finished between the
   * click and the request is rejected by the API, and the user should see that
   * rather than a "Cancelled" badge over a run that actually completed.
   */
  const cancelExecution = useCallback(async () => {
    const executionId = currentExecutionId;

    if (cleanupRef.current) {
      Promise.resolve(cleanupRef.current()).catch((error) =>
        console.error("Error during cleanup:", error)
      );
      cleanupRef.current = null;
    }

    setWorkflowStatus("cancelled");

    if (!executionId || !workflowId) return;

    try {
      await cancelWorkflowExecution(workflowId, executionId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel execution";
      console.error("Failed to cancel execution:", error);
      setWorkflowErrorMessage(message);
      toast.error(message);
    }
  }, [
    currentExecutionId,
    workflowId,
    cancelWorkflowExecution,
    setWorkflowStatus,
  ]);

  const startExecution = useCallback(() => {
    deselectAll();

    handleExecuteRequest((triggerData) => {
      const cleanup = handleExecute(triggerData);
      if (cleanup) cleanupRef.current = cleanup;
    });
  }, [deselectAll, handleExecute, handleExecuteRequest]);

  const handleActionButtonClick = useCallback(() => {
    if (workflowStatus === "idle") {
      startExecution();
      return;
    }

    deselectAll();

    if (workflowStatus === "submitted" || workflowStatus === "executing") {
      void cancelExecution();
      return;
    }

    resetNodeStates();
    setWorkflowStatus("idle");
  }, [
    workflowStatus,
    resetNodeStates,
    startExecution,
    deselectAll,
    cancelExecution,
    setWorkflowStatus,
  ]);

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
  };
}
