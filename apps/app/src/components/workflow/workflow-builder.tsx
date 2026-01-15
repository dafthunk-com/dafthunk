import type { ObjectReference, WorkflowType } from "@dafthunk/types";
import type {
  Connection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkflowExecution } from "@/services/workflow-service";
import { cn } from "@/utils/utils";

import { EmailTriggerDialog } from "./email-trigger-dialog";
import { ExecutionEmailDialog } from "./execution-email-dialog";
import { HttpRequestConfigDialog } from "./http-request-config-dialog";
import { HttpRequestIntegrationDialog } from "./http-request-integration-dialog";
import { HttpWebhookIntegrationDialog } from "./http-webhook-integration-dialog";
import { useWorkflowState } from "./use-workflow-state";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowProvider } from "./workflow-context";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { WorkflowSidebar } from "./workflow-sidebar";
import type {
  NodeExecutionState,
  NodeType,
  WorkflowEdgeType,
  WorkflowExecution,
  WorkflowExecutionStatus,
  WorkflowNodeType,
} from "./workflow-types";

export interface WorkflowBuilderProps {
  workflowId: string;
  workflowType?: WorkflowType;
  initialNodes?: ReactFlowNode<WorkflowNodeType>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeType>[];
  nodeTypes?: NodeType[];
  onNodesChange?: (nodes: ReactFlowNode<WorkflowNodeType>[]) => void;
  onEdgesChange?: (edges: ReactFlowEdge<WorkflowEdgeType>[]) => void;
  validateConnection?: (connection: Connection) => boolean;
  executeWorkflow?: (
    workflowId: string,
    onExecution: (execution: WorkflowExecution) => void,
    triggerData?: unknown
  ) => void | (() => void | Promise<void>);
  initialWorkflowExecution?: WorkflowExecution;
  disabled?: boolean;
  onDeployWorkflow?: (e: React.MouseEvent) => void;
  createObjectUrl: (objectReference: ObjectReference) => string;
  expandedOutputs?: boolean;
  workflowName?: string;
  workflowDescription?: string;
  onWorkflowUpdate?: (name: string, description?: string) => void;
  orgHandle: string;
  deploymentVersions?: number[];
  mutateDeploymentHistory?: () => void;
  wsExecuteWorkflow?: (options?: {
    parameters?: Record<string, unknown>;
  }) => void;
  showSidebar?: boolean;
}

// Helper: Apply initial execution state to nodes
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
      return { ...output, value: outputValue };
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

export function WorkflowBuilder({
  workflowId,
  workflowType,
  initialNodes = [],
  initialEdges = [],
  nodeTypes = [],
  onNodesChange: onNodesChangeFromParent,
  onEdgesChange: onEdgesChangeFromParent,
  validateConnection,
  executeWorkflow,
  initialWorkflowExecution,
  disabled = false,
  onDeployWorkflow,
  createObjectUrl,
  expandedOutputs = false,
  workflowName,
  workflowDescription,
  onWorkflowUpdate,
  orgHandle,
  deploymentVersions: _deploymentVersions = [],
  mutateDeploymentHistory: _mutateDeploymentHistory,
  wsExecuteWorkflow,
  showSidebar = true,
}: WorkflowBuilderProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(showSidebar);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowExecutionStatus>(
    initialWorkflowExecution?.status || "idle"
  );
  const [workflowErrorMessage, setWorkflowErrorMessage] = useState<
    string | undefined
  >(initialWorkflowExecution?.error);
  const [errorDialogOpen, setErrorDialogOpen] = useState(
    initialWorkflowExecution?.status === "exhausted"
  );
  const cleanupRef = useRef<(() => void | Promise<void>) | null>(null);
  const initializedRef = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<
    string | undefined
  >(initialWorkflowExecution?.id);

  // Trigger dialog state
  const [isHttpIntegrationDialogOpen, setIsHttpIntegrationDialogOpen] =
    useState(false);
  const [isEmailTriggerDialogOpen, setIsEmailTriggerDialogOpen] =
    useState(false);

  // Store the current execution callback so the WebSocket wrapper can use it
  const executionCallbackRef = useRef<
    ((execution: WorkflowExecution) => void) | null
  >(null);

  // Create a wrapper that properly connects WebSocket execution to the workflow-builder callback
  const wsExecuteWorkflowWrapper = useCallback(
    (options?: { parameters?: Record<string, unknown> }) => {
      // Call the provided executeWorkflow function which should set up callbacks properly
      if (executeWorkflow && executionCallbackRef.current) {
        executeWorkflow(
          workflowId,
          executionCallbackRef.current,
          options?.parameters
        );
      } else if (wsExecuteWorkflow) {
        // Fallback to direct WebSocket execution if no wrapper provided
        wsExecuteWorkflow(options);
      }
    },
    [executeWorkflow, wsExecuteWorkflow, workflowId]
  );

  // Use workflow execution hook for execution dialogs
  const {
    executeWorkflow: executeWorkflowWithForm,
    isEmailFormDialogVisible,
    isHttpRequestConfigDialogVisible,
    submitHttpRequestConfig,
    submitEmailFormData,
    closeExecutionForm,
  } = useWorkflowExecution(orgHandle, wsExecuteWorkflowWrapper);

  // Execution coordination
  const executeRef = useRef<((triggerData?: unknown) => void) | null>(null);

  const {
    nodes,
    edges,
    selectedNodes,
    selectedEdges,
    isNodeSelectorOpen: handleIsNodeSelectorOpen,
    setIsNodeSelectorOpen: handleSetIsNodeSelectorOpen,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    handleAddNode,
    handleNodeSelect,
    updateNodeExecution,
    setReactFlowInstance,
    reactFlowInstance,
    connectionValidationState,
    isValidConnection,
    updateNodeData,
    updateEdgeData,
    deleteEdge,
    deleteSelected,
    deselectAll,
    duplicateSelected,
    applyLayout,
    copySelected,
    cutSelected,
    pasteFromClipboard,
    hasClipboardData,
    onNodeDragStop,
  } = useWorkflowState({
    initialNodes,
    initialEdges,
    onNodesChangePersist: onNodesChangeFromParent,
    onEdgesChangePersist: onEdgesChangeFromParent,
    validateConnection,
    createObjectUrl,
    disabled,
  });

  // Apply initial workflow execution state once
  useEffect(() => {
    if (
      initialWorkflowExecution &&
      !initializedRef.current &&
      nodes.length > 0
    ) {
      initializedRef.current = true;
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

  const handleExecuteRequest = useCallback(
    (execute: (triggerData?: unknown) => void) => {
      // For workflows that don't require parameters, execute directly
      if (
        !workflowType ||
        workflowType === "manual" ||
        workflowType === "scheduled" ||
        workflowType === "queue_message"
      ) {
        execute(undefined);
        return;
      }

      // For http_webhook, http_request and email_message workflows that require dialogs:
      // Store the execute callback for later use when dialog is submitted
      executeRef.current = execute;

      // Create the execution callback that will be used when the dialog is submitted
      // Note: We don't set status to "executing" here - that happens when the dialog is submitted
      const executionCallback = (execution: WorkflowExecution) => {
        // Capture execution ID for feedback
        if (execution.id) {
          setCurrentExecutionId(execution.id);
        }

        // Set status to executing on first callback if not already set
        setWorkflowStatus((currentStatus) => {
          if (currentStatus === "idle" || currentStatus === "cancelled") {
            resetNodeStates("executing");
            return "executing";
          }
          if (
            currentStatus === "executing" &&
            execution.status === "submitted"
          ) {
            return currentStatus;
          }
          return execution.status;
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
      };

      // Store callback in ref so WebSocket wrapper can access it
      executionCallbackRef.current = executionCallback;

      if (workflowId) {
        // http_webhook, http_request or email_message - check for parameters and show dialog
        executeWorkflowWithForm(
          workflowId,
          executionCallback,
          nodes,
          nodeTypes as any,
          workflowType
        );
      }
    },
    [
      workflowType,
      workflowId,
      executeWorkflowWithForm,
      nodes,
      nodeTypes,
      resetNodeStates,
      updateNodeExecution,
    ]
  );

  const handleExecute = useCallback(
    (triggerData?: unknown) => {
      if (!executeWorkflow) return null;

      resetNodeStates("executing");
      setWorkflowStatus("executing"); // Local immediate update

      // Create the callback and store it in the ref so WebSocket wrapper can use it
      const executionCallback = (execution: WorkflowExecution) => {
        // Capture execution ID for feedback
        if (execution.id) {
          setCurrentExecutionId(execution.id);
        }

        // Only update status if the new status is not 'idle' while we are 'executing',
        // or if the local status is not 'executing' anymore (e.g., already completed/errored).
        setWorkflowStatus((currentStatus) => {
          if (
            currentStatus === "executing" &&
            execution.status === "submitted"
          ) {
            return currentStatus; // Ignore initial idle updates while executing
          }
          return execution.status; // Apply other status updates
        });

        // Update workflow error message
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
      };

      // Store callback in ref so WebSocket wrapper can access it
      executionCallbackRef.current = executionCallback;

      return executeWorkflow(workflowId, executionCallback, triggerData);
    },
    [executeWorkflow, workflowId, resetNodeStates, updateNodeExecution]
  );

  const startExecution = useCallback(() => {
    // Deselect all nodes/edges so the sidebar shows the workflow view with feedback
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

      if (workflowStatus === "idle" || workflowStatus === "cancelled") {
        if (workflowStatus === "cancelled") resetNodeStates();
        startExecution();
      } else if (
        workflowStatus === "submitted" ||
        workflowStatus === "executing"
      ) {
        // Stop execution
        deselectAll();
        if (cleanupRef.current) {
          Promise.resolve(cleanupRef.current()).catch((error) =>
            console.error("Error during cleanup:", error)
          );
          cleanupRef.current = null;
        }
        setWorkflowStatus("cancelled");
      } else {
        // completed, error, exhausted - Clear outputs & reset
        deselectAll();
        resetNodeStates();
        setWorkflowStatus("idle");
      }
    },
    [workflowStatus, resetNodeStates, startExecution, deselectAll]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible((prev) => !prev);
  }, []);

  const handleFitToScreen = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.25, duration: 200, maxZoom: 2 });
  }, [reactFlowInstance]);

  const handleNodeDoubleClick = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      // Min width: 320px, Max width: 800px
      setSidebarWidth(Math.min(Math.max(newWidth, 320), 800));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <ReactFlowProvider>
      <WorkflowProvider
        updateNodeData={disabled ? undefined : updateNodeData}
        updateEdgeData={disabled ? undefined : updateEdgeData}
        deleteEdge={disabled ? undefined : deleteEdge}
        edges={edges}
        disabled={disabled}
        expandedOutputs={expandedOutputs}
        nodeTypes={nodeTypes}
        workflowType={workflowType}
      >
        <div className="w-full h-full flex">
          <div
            className="h-full overflow-hidden relative"
            style={{
              width: isSidebarVisible
                ? `calc(100% - ${sidebarWidth}px)`
                : "100%",
            }}
          >
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              connectionValidationState={connectionValidationState}
              onNodesChange={onNodesChange}
              onEdgesChange={disabled ? () => {} : onEdgesChange}
              onConnect={disabled ? () => {} : onConnect}
              onConnectStart={disabled ? () => {} : onConnectStart}
              onConnectEnd={disabled ? () => {} : onConnectEnd}
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeDragStop={onNodeDragStop}
              onInit={setReactFlowInstance}
              onAddNode={disabled ? undefined : handleAddNode}
              onAction={
                !disabled && executeWorkflow
                  ? handleActionButtonClick
                  : undefined
              }
              onDeploy={
                !disabled && onDeployWorkflow ? onDeployWorkflow : undefined
              }
              workflowStatus={workflowStatus}
              workflowErrorMessage={workflowErrorMessage}
              workflowType={workflowType}
              onShowHttpIntegration={
                workflowType === "http_webhook" ||
                workflowType === "http_request"
                  ? () => setIsHttpIntegrationDialogOpen(true)
                  : undefined
              }
              onShowEmailTrigger={
                workflowType === "email_message"
                  ? () => setIsEmailTriggerDialogOpen(true)
                  : undefined
              }
              onToggleSidebar={toggleSidebar}
              isSidebarVisible={isSidebarVisible}
              isValidConnection={isValidConnection}
              disabled={disabled}
              onFitToScreen={handleFitToScreen}
              selectedNodes={selectedNodes}
              selectedEdges={selectedEdges}
              onDeleteSelected={disabled ? undefined : deleteSelected}
              onDuplicateSelected={disabled ? undefined : duplicateSelected}
              onApplyLayout={disabled ? undefined : applyLayout}
              onCopySelected={disabled ? undefined : copySelected}
              onCutSelected={disabled ? undefined : cutSelected}
              onPasteFromClipboard={disabled ? undefined : pasteFromClipboard}
              hasClipboardData={hasClipboardData}
            />
          </div>

          {isSidebarVisible && (
            <>
              <div
                className={cn(
                  "w-1 bg-background border-l border-border cursor-col-resize",
                  isResizing && "bg-muted"
                )}
                onMouseDown={handleResizeStart}
              />
              <div style={{ width: `${sidebarWidth}px` }}>
                <WorkflowSidebar
                  nodes={nodes}
                  selectedNodes={selectedNodes}
                  selectedEdges={selectedEdges}
                  onNodeUpdate={disabled ? undefined : updateNodeData}
                  onEdgeUpdate={disabled ? undefined : updateEdgeData}
                  createObjectUrl={createObjectUrl}
                  disabled={disabled}
                  workflowName={workflowName}
                  workflowDescription={workflowDescription}
                  onWorkflowUpdate={disabled ? undefined : onWorkflowUpdate}
                  workflowStatus={workflowStatus}
                  workflowErrorMessage={workflowErrorMessage}
                  executionId={currentExecutionId}
                />
              </div>
            </>
          )}

          <WorkflowNodeSelector
            open={disabled ? false : handleIsNodeSelectorOpen}
            onSelect={handleNodeSelect}
            onClose={() => handleSetIsNodeSelectorOpen(false)}
            templates={nodeTypes}
            workflowName={workflowName}
            workflowDescription={workflowDescription}
            workflowType={workflowType}
          />
        </div>

        {/* HTTP Webhook integration dialog */}
        {workflowType === "http_webhook" && (
          <HttpWebhookIntegrationDialog
            isOpen={isHttpIntegrationDialogOpen}
            onClose={() => setIsHttpIntegrationDialogOpen(false)}
            orgHandle={orgHandle}
            workflowId={workflowId}
            deploymentVersion="dev"
            nodes={nodes}
            nodeTypes={nodeTypes || []}
          />
        )}

        {/* HTTP Request integration dialog */}
        {workflowType === "http_request" && (
          <HttpRequestIntegrationDialog
            isOpen={isHttpIntegrationDialogOpen}
            onClose={() => setIsHttpIntegrationDialogOpen(false)}
            orgHandle={orgHandle}
            workflowId={workflowId}
            deploymentVersion="dev"
            nodes={nodes}
            nodeTypes={nodeTypes || []}
          />
        )}

        {workflowType === "email_message" && (
          <EmailTriggerDialog
            isOpen={isEmailTriggerDialogOpen}
            onClose={() => setIsEmailTriggerDialogOpen(false)}
            workflowId={workflowId}
          />
        )}

        {/* Execution Dialogs */}
        {/* HTTP Request Config Dialog */}
        {(workflowType === "http_webhook" ||
          workflowType === "http_request") && (
          <HttpRequestConfigDialog
            isOpen={isHttpRequestConfigDialogVisible}
            onClose={closeExecutionForm}
            onSubmit={submitHttpRequestConfig}
          />
        )}

        {/* Email Execution Dialog */}
        {workflowType === "email_message" && (
          <ExecutionEmailDialog
            isOpen={isEmailFormDialogVisible}
            onClose={closeExecutionForm}
            onCancel={() => {
              closeExecutionForm();
              executeRef.current = null;
            }}
            onSubmit={submitEmailFormData}
          />
        )}

        <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Workflow Execution Error</DialogTitle>
              <DialogDescription>
                You have run out of compute credits. Thanks for checking out the
                preview. The code is available at
                https://github.com/dafthunk-com/dafthunk.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setErrorDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </WorkflowProvider>
    </ReactFlowProvider>
  );
}
