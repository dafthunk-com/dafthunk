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
import { cn } from "@/utils/utils";

import { useWorkflowState } from "./use-workflow-state";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowProvider } from "./workflow-context";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { WorkflowSidebar } from "./workflow-sidebar";
import type {
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
    onExecution: (execution: WorkflowExecution) => void
  ) => void | (() => void | Promise<void>);
  initialWorkflowExecution?: WorkflowExecution;
  disabled?: boolean;
  onDeployWorkflow?: (e: React.MouseEvent) => void;
  onSetSchedule?: () => void;
  onShowHttpIntegration?: () => void;
  onShowEmailTrigger?: () => void;
  createObjectUrl: (objectReference: ObjectReference) => string;
  expandedOutputs?: boolean;
  workflowName?: string;
  workflowDescription?: string;
  onWorkflowUpdate?: (name: string, description?: string) => void;
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
  onSetSchedule,
  onShowHttpIntegration,
  onShowEmailTrigger,
  createObjectUrl,
  expandedOutputs = false,
  workflowName,
  workflowDescription,
  onWorkflowUpdate,
}: WorkflowBuilderProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowExecutionStatus>(
    initialWorkflowExecution?.status || "idle"
  );
  const [workflowErrorMessage, setWorkflowErrorMessage] = useState<
    string | undefined
  >(initialWorkflowExecution?.error);
  const [errorDialogState, setErrorDialogState] = useState<{
    open: boolean;
    message: string;
  }>({
    open: initialWorkflowExecution?.status === "exhausted",
    message:
      initialWorkflowExecution?.status === "exhausted"
        ? "You have run out of compute credits. Thanks for checking out the preview. The code is available at https://github.com/dafthunk-com/dafthunk."
        : "",
  });
  const cleanupRef = useRef<(() => void | Promise<void>) | null>(null);
  const initializedRef = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(384); // w-96 = 384px
  const [isResizing, setIsResizing] = useState(false);

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

  // Apply initial workflow execution state
  useEffect(() => {
    // Only apply the initial state once
    if (
      initialWorkflowExecution &&
      !initializedRef.current &&
      nodes.length > 0
    ) {
      initializedRef.current = true;
      setWorkflowStatus(initialWorkflowExecution.status);

      console.log(
        "Initializing workflow with execution:",
        initialWorkflowExecution
      );

      // Process each node execution
      initialWorkflowExecution.nodeExecutions.forEach((nodeExec) => {
        const node = nodes.find((n) => n.id === nodeExec.nodeId);
        if (!node) {
          console.warn(`Node not found for execution: ${nodeExec.nodeId}`);
          return;
        }

        console.log(`Processing node ${nodeExec.nodeId}:`, {
          node: node.data,
          execution: nodeExec,
        });

        // Create updated outputs with values
        const updatedOutputs = node.data.outputs.map((output) => {
          // Try to find the output value using both id and name
          let outputValue = undefined;
          if (nodeExec.outputs) {
            // First check by id
            outputValue = nodeExec.outputs[output.id];

            // If not found, check by name
            if (outputValue === undefined) {
              outputValue = nodeExec.outputs[output.name];
            }
          }

          console.log(`Output ${output.name}:`, {
            original: output.value,
            new: outputValue,
            nodeExecutionOutputs: nodeExec.outputs,
          });

          return {
            ...output,
            value: outputValue,
          };
        });

        console.log(`Updated outputs for ${nodeExec.nodeId}:`, updatedOutputs);

        // Force the executionState to be completed even if it's not in the execution
        // This ensures the outputs are displayed
        const executionState =
          nodeExec.status === "idle" &&
          updatedOutputs.some((o) => o.value !== undefined)
            ? "completed"
            : nodeExec.status;

        // Update the node data
        updateNodeData(nodeExec.nodeId, {
          outputs: updatedOutputs,
          executionState: executionState,
          error: nodeExec.error,
        });
      });

      // Handle error dialog only for workflow-level errors (not node errors)
      if (initialWorkflowExecution.status === "exhausted") {
        setErrorDialogState({
          open: true,
          message:
            "You have run out of compute credits. Thanks for checking out the preview. The code is available at https://github.com/dafthunk-com/dafthunk.",
        });
      }
    }
  }, [initialWorkflowExecution, nodes, updateNodeData]);

  const resetNodeStates = useCallback(() => {
    nodes.forEach((node) => {
      updateNodeExecution(node.id, {
        state: "idle",
        outputs: {},
        error: undefined,
      });
    });
    setWorkflowErrorMessage(undefined);
  }, [nodes, updateNodeExecution]);

  const handleExecute = useCallback(() => {
    if (!executeWorkflow) return null;

    resetNodeStates();
    setWorkflowStatus("executing"); // Local immediate update

    return executeWorkflow(workflowId, (execution: WorkflowExecution) => {
      // Only update status if the new status is not 'idle' while we are 'executing',
      // or if the local status is not 'executing' anymore (e.g., already completed/errored).
      setWorkflowStatus((currentStatus) => {
        if (currentStatus === "executing" && execution.status === "submitted") {
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

      // Only show dialog for workflow-level errors (not node errors)
      if (execution.status === "exhausted") {
        setErrorDialogState({
          open: true,
          message:
            "You have run out of compute credits. Thanks for checking out the preview. The code is available at https://github.com/dafthunk-com/dafthunk.",
        });
      }
    });
  }, [executeWorkflow, workflowId, resetNodeStates, updateNodeExecution]);

  const handleActionButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      switch (workflowStatus) {
        case "idle": {
          const cleanup = handleExecute();
          if (cleanup) cleanupRef.current = cleanup;
          break;
        }
        case "submitted":
        case "executing": {
          if (cleanupRef.current) {
            const cleanup = cleanupRef.current();
            if (cleanup instanceof Promise) {
              cleanup.catch((error) => {
                console.error("Error during cleanup:", error);
              });
            }
            cleanupRef.current = null;
          }
          setWorkflowStatus("cancelled");
          break;
        }
        case "completed":
        case "error":
        case "exhausted": {
          resetNodeStates();
          setWorkflowStatus("idle");
          break;
        }
        case "cancelled": {
          resetNodeStates();
          const cleanup = handleExecute();
          if (cleanup) cleanupRef.current = cleanup;
          break;
        }
      }
    },
    [workflowStatus, handleExecute, resetNodeStates]
  );

  const toggleSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSidebarVisible((prev) => !prev);
  }, []);

  const handleFitToScreen = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.25, duration: 200, maxZoom: 2 });
      }
    },
    [reactFlowInstance]
  );

  const handleNodeDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
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
              onSetSchedule={onSetSchedule}
              onShowHttpIntegration={onShowHttpIntegration}
              onShowEmailTrigger={onShowEmailTrigger}
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

        <Dialog
          open={errorDialogState.open}
          onOpenChange={(open) =>
            setErrorDialogState((prev) => ({ ...prev, open }))
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Workflow Execution Error</DialogTitle>
              <DialogDescription>{errorDialogState.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() =>
                  setErrorDialogState((prev) => ({ ...prev, open: false }))
                }
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </WorkflowProvider>
    </ReactFlowProvider>
  );
}
