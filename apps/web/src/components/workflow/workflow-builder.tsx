import type { ObjectReference, WorkflowType } from "@dafthunk/types";
import type {
  Connection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  upsertCronTrigger,
  useWorkflowExecution,
} from "@/services/workflow-service";
import { cn } from "@/utils/utils";

import { EmailTriggerDialog } from "./email-trigger-dialog";
import { ExecutionEmailDialog } from "./execution-email-dialog";
import { ExecutionFormDialog } from "./execution-form-dialog";
import { ExecutionJsonBodyDialog } from "./execution-json-body-dialog";
import { HttpIntegrationDialog } from "./http-integration-dialog";
import { type CronFormData, SetCronDialog } from "./set-cron-dialog";
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
  cronTrigger?: any;
  mutateCronTrigger?: (data?: any) => void;
  deploymentVersions?: number[];
  mutateDeploymentHistory?: () => void;
  wsExecuteWorkflow?: (options?: {
    parameters?: Record<string, unknown>;
  }) => void;
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
      const outputValue = nodeExec.outputs?.[output.id] ?? nodeExec.outputs?.[output.name];
      return { ...output, value: outputValue };
    });

    const executionState =
      nodeExec.status === "idle" && updatedOutputs.some((o) => o.value !== undefined)
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
  cronTrigger,
  mutateCronTrigger,
  deploymentVersions = [],
  mutateDeploymentHistory,
  wsExecuteWorkflow,
}: WorkflowBuilderProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
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

  // Trigger dialog state
  const [isSetCronDialogOpen, setIsSetCronDialogOpen] = useState(false);
  const [isHttpIntegrationDialogOpen, setIsHttpIntegrationDialogOpen] =
    useState(false);
  const [isEmailTriggerDialogOpen, setIsEmailTriggerDialogOpen] =
    useState(false);

  // Use workflow execution hook for execution dialogs
  const {
    executeWorkflow: executeWorkflowWithForm,
    isFormDialogVisible,
    isJsonBodyDialogVisible,
    isEmailFormDialogVisible,
    executionFormParameters,
    executionJsonBodyParameters,
    closeExecutionForm,
  } = useWorkflowExecution(orgHandle, wsExecuteWorkflow);

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
    if (initialWorkflowExecution && !initializedRef.current && nodes.length > 0) {
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

  const handleSaveCron = useCallback(
    async (data: CronFormData) => {
      if (!workflowId || !orgHandle) return;
      try {
        const updatedCron = await upsertCronTrigger(workflowId, orgHandle, data);
        mutateCronTrigger?.(updatedCron);
        toast.success("Cron schedule saved successfully.");
        setIsSetCronDialogOpen(false);
      } catch (error) {
        console.error("Failed to save cron schedule:", error);
        toast.error("Failed to save cron schedule. Please try again.");
      }
    },
    [workflowId, orgHandle, mutateCronTrigger]
  );

  const handleDialogSubmit = useCallback(
    (data: unknown) => {
      executeRef.current?.(data);
      executeRef.current = null;
      closeExecutionForm();
    },
    [closeExecutionForm]
  );

  const handleExecuteRequest = useCallback(
    (execute: (triggerData?: unknown) => void) => {
      // For manual and cron workflows, execute immediately (no dialog needed)
      if (
        !workflowType ||
        workflowType === "manual" ||
        workflowType === "cron"
      ) {
        execute();
        return;
      }

      // For http_request and email_message workflows that require dialogs:
      // Store the execute callback for later use when dialog is submitted
      executeRef.current = execute;

      // Trigger the dialog opening by calling executeWorkflow from useWorkflowExecution
      // This will check for parameters and open the appropriate dialog
      if (workflowId) {
        executeWorkflowWithForm(
          workflowId,
          () => {}, // Dummy callback since we'll use the stored execute callback
          nodes,
          nodeTypes as any,
          workflowType
        );
      }
    },
    [workflowType, workflowId, executeWorkflowWithForm, nodes, nodeTypes]
  );

  const handleExecute = useCallback(
    (triggerData?: unknown) => {
      if (!executeWorkflow) return null;

      resetNodeStates("executing");
      setWorkflowStatus("executing"); // Local immediate update

      return executeWorkflow(
        workflowId,
        (execution: WorkflowExecution) => {
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
        },
        triggerData
      );
    },
    [executeWorkflow, workflowId, resetNodeStates, updateNodeExecution]
  );

  const startExecution = useCallback(() => {
    handleExecuteRequest((triggerData) => {
      const cleanup = handleExecute(triggerData);
      if (cleanup) cleanupRef.current = cleanup;
    });
  }, [handleExecute, handleExecuteRequest]);

  const handleActionButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (workflowStatus === "idle" || workflowStatus === "cancelled") {
        if (workflowStatus === "cancelled") resetNodeStates();
        startExecution();
      } else if (workflowStatus === "submitted" || workflowStatus === "executing") {
        if (cleanupRef.current) {
          Promise.resolve(cleanupRef.current()).catch((error) =>
            console.error("Error during cleanup:", error)
          );
          cleanupRef.current = null;
        }
        setWorkflowStatus("cancelled");
      } else {
        // completed, error, exhausted
        resetNodeStates();
        setWorkflowStatus("idle");
      }
    },
    [workflowStatus, resetNodeStates, startExecution]
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
              onSetSchedule={
                workflowType === "cron"
                  ? () => {
                      mutateDeploymentHistory?.();
                      mutateCronTrigger?.();
                      setIsSetCronDialogOpen(true);
                    }
                  : undefined
              }
              onShowHttpIntegration={
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
          />
        </div>

        {/* Trigger Dialogs */}
        {workflowType === "http_request" && (
          <HttpIntegrationDialog
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

        {workflowType === "cron" && (
          <SetCronDialog
            isOpen={isSetCronDialogOpen}
            onClose={() => setIsSetCronDialogOpen(false)}
            onSubmit={handleSaveCron}
            initialData={{
              cronExpression: cronTrigger?.cronExpression || "",
              active: cronTrigger?.active ?? true,
              versionAlias: cronTrigger?.versionAlias || "dev",
              versionNumber: cronTrigger?.versionNumber,
            }}
            deploymentVersions={deploymentVersions}
            workflowName={workflowName}
          />
        )}

        {/* Execution Dialogs */}
        {workflowType === "http_request" &&
          executionFormParameters.length > 0 && (
            <ExecutionFormDialog
              isOpen={isFormDialogVisible}
              onClose={closeExecutionForm}
              onCancel={() => {
                closeExecutionForm();
                executeRef.current = null;
              }}
              parameters={executionFormParameters}
              onSubmit={handleDialogSubmit}
            />
          )}

        {workflowType === "http_request" &&
          executionJsonBodyParameters.length > 0 && (
            <ExecutionJsonBodyDialog
              isOpen={isJsonBodyDialogVisible}
              onClose={closeExecutionForm}
              onCancel={() => {
                closeExecutionForm();
                executeRef.current = null;
              }}
              parameters={executionJsonBodyParameters}
              onSubmit={(data) => handleDialogSubmit({ jsonBody: data.jsonBody })}
            />
          )}

        {workflowType === "email_message" && (
          <ExecutionEmailDialog
            isOpen={isEmailFormDialogVisible}
            onClose={closeExecutionForm}
            onCancel={() => {
              closeExecutionForm();
              executeRef.current = null;
            }}
            onSubmit={handleDialogSubmit}
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
