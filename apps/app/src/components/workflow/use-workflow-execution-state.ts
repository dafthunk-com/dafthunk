import type { WorkflowTrigger } from "@dafthunk/types";
import {
  isSubscriptionRequiredError,
  parseSubscriptionRequiredError,
} from "@dafthunk/utils";
import type { Node as ReactFlowNode } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EmailData } from "@/components/workflow/execution-email-dialog";
import type { HttpRequestConfig } from "@/components/workflow/http-request-config-dialog";
import { useBilling } from "@/services/billing-service";
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
  /** Open when a run is blocked by a subscription requirement (pre- or post-flight). */
  upgradeDialogOpen: boolean;
  setUpgradeDialogOpen: (open: boolean) => void;
  /** "preflight" = blocked before execution; "post-failure" = surfaced after failure. */
  upgradeDialogVariant: "preflight" | "post-failure";
  /** Subscription-gated node types that triggered the upgrade prompt. */
  upgradeDialogGatedNodeTypes: NodeType[];
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

  // Subscription upgrade prompt — surfaced for both pre-flight gating and
  // post-failure detection of `subscriptionRequiredMessage` errors.
  const { billing } = useBilling();
  const isPro = billing?.plan === "pro";
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradeDialogVariant, setUpgradeDialogVariant] = useState<
    "preflight" | "post-failure"
  >("preflight");
  const [upgradeDialogGatedNodeTypes, setUpgradeDialogGatedNodeTypes] =
    useState<NodeType[]>([]);

  // Map of nodeType id → NodeType for fast lookup of subscription metadata
  const nodeTypeById = useMemo(() => {
    const map = new Map<string, NodeType>();
    for (const nt of nodeTypes) map.set(nt.type, nt);
    return map;
  }, [nodeTypes]);

  /**
   * Returns the subscription-gated node types currently present in the
   * workflow. Empty array means the workflow can run on any plan.
   */
  const findGatedNodeTypes = useCallback((): NodeType[] => {
    const seen = new Set<string>();
    const gated: NodeType[] = [];
    for (const node of nodes) {
      const typeId = node.data.nodeType;
      if (!typeId || seen.has(typeId)) continue;
      const nt = nodeTypeById.get(typeId);
      if (nt?.subscription) {
        seen.add(typeId);
        gated.push(nt);
      }
    }
    return gated;
  }, [nodes, nodeTypeById]);

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
        });

        if (execution.status === "exhausted") {
          setErrorDialogOpen(true);
        }

        // Post-failure: if any node failed because it requires a subscription,
        // surface the upgrade dialog. Covers triggered/scheduled runs that
        // bypass the pre-flight gate (and any race where billing was still
        // loading on Run).
        if (execution.status === "error") {
          const subscriptionErrorTypes: string[] = [];
          for (const ne of execution.nodeExecutions) {
            const parsed = parseSubscriptionRequiredError(ne.error);
            if (parsed) subscriptionErrorTypes.push(parsed.nodeType);
          }
          if (
            subscriptionErrorTypes.length === 0 &&
            isSubscriptionRequiredError(execution.error)
          ) {
            const parsed = parseSubscriptionRequiredError(execution.error);
            if (parsed) subscriptionErrorTypes.push(parsed.nodeType);
          }
          if (subscriptionErrorTypes.length > 0) {
            const seen = new Set<string>();
            const gated: NodeType[] = [];
            for (const typeId of subscriptionErrorTypes) {
              if (seen.has(typeId)) continue;
              seen.add(typeId);
              const nt = nodeTypeById.get(typeId);
              // Synthesize a minimal NodeType if the registry hasn't loaded
              // it (e.g. in read-only views with a partial type list).
              gated.push(
                nt ?? {
                  id: typeId,
                  type: typeId,
                  name: typeId,
                  icon: "sparkles",
                  tags: [],
                  inputs: [],
                  outputs: [],
                  subscription: true,
                }
              );
            }
            setUpgradeDialogGatedNodeTypes(gated);
            setUpgradeDialogVariant("post-failure");
            setUpgradeDialogOpen(true);
          }
        }
      };
    },
    [resetNodeStates, updateNodeExecution, nodes, nodeTypeById]
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

    // Pre-flight gate: if the workflow contains subscription-gated nodes and
    // the user isn't on Pro, intercept and prompt for upgrade rather than
    // letting the runtime fail the execution. Skipped while billing is still
    // loading (no `billing`) — the runtime remains the authoritative gate.
    if (billing && !isPro) {
      const gated = findGatedNodeTypes();
      if (gated.length > 0) {
        setUpgradeDialogGatedNodeTypes(gated);
        setUpgradeDialogVariant("preflight");
        setUpgradeDialogOpen(true);
        return;
      }
    }

    handleExecuteRequest((triggerData) => {
      const cleanup = handleExecute(triggerData);
      if (cleanup) cleanupRef.current = cleanup;
    });
  }, [
    deselectAll,
    handleExecute,
    handleExecuteRequest,
    billing,
    isPro,
    findGatedNodeTypes,
  ]);

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
    upgradeDialogOpen,
    setUpgradeDialogOpen,
    upgradeDialogVariant,
    upgradeDialogGatedNodeTypes,
  };
}
