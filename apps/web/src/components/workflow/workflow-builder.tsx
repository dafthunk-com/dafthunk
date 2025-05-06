import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { useWorkflowState } from "./useWorkflowState";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowBuilderProps, WorkflowExecutionStatus, WorkflowNodeExecution, WorkflowExecution } from "./workflow-types";
import { useEffect, useState, useRef, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowProvider } from "./workflow-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function WorkflowBuilder({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  nodeTemplates = [],
  onNodesChange,
  onEdgesChange,
  validateConnection,
  executeWorkflow,
  readonly = false,
}: WorkflowBuilderProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [workflowStatus, setWorkflowStatus] =
    useState<WorkflowExecutionStatus>("idle");
  const [errorDialogState, setErrorDialogState] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: "",
  });
  const cleanupRef = useRef<(() => void) | null>(null);

  const {
    nodes,
    edges,
    selectedNode: handleSelectedNode,
    selectedEdge: handleSelectedEdge,
    isNodeSelectorOpen: handleIsNodeSelectorOpen,
    setIsNodeSelectorOpen: handleSetIsNodeSelectorOpen,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleAddNode,
    handleNodeSelect,
    updateNodeExecution,
    setReactFlowInstance,
    connectionValidationState,
    isValidConnection,
    updateNodeData,
    updateEdgeData,
  } = useWorkflowState({
    initialNodes,
    initialEdges,
    onNodesChange: readonly ? undefined : onNodesChange,
    onEdgesChange: readonly ? undefined : onEdgesChange,
    validateConnection,
    readonly,
  });

  // Track input and output connections
  useEffect(() => {
    if (readonly) return; // Skip connection tracking in readonly mode

    const connectedInputs = new Map();
    const connectedOutputs = new Map();

    edges.forEach((edge) => {
      if (edge.targetHandle)
        connectedInputs.set(`${edge.target}-${edge.targetHandle}`, true);
      if (edge.sourceHandle)
        connectedOutputs.set(`${edge.source}-${edge.sourceHandle}`, true);
    });

    nodes.forEach((node) => {
      const updatedInputs = node.data.inputs.map((input) => ({
        ...input,
        isConnected: connectedInputs.has(`${node.id}-${input.id}`),
      }));

      const updatedOutputs = node.data.outputs.map((output) => ({
        ...output,
        isConnected: connectedOutputs.has(`${node.id}-${output.id}`),
      }));

      const inputChanged = updatedInputs.some(
        (input, i) => input.isConnected !== node.data.inputs[i].isConnected
      );

      const outputChanged = updatedOutputs.some(
        (output, i) => output.isConnected !== node.data.outputs[i].isConnected
      );

      if (inputChanged || outputChanged) {
        updateNodeData(node.id, {
          inputs: updatedInputs,
          outputs: updatedOutputs,
        });
      }
    });
  }, [edges, nodes, updateNodeData, readonly]);

  const resetNodeStates = useCallback(() => {
    nodes.forEach((node) => {
      updateNodeExecution(node.id, {
        state: "idle",
        outputs: {},
        error: undefined,
      });
    });
  }, [nodes, updateNodeExecution]);

  const handleExecute = useCallback(() => {
    if (!executeWorkflow) return null;

    resetNodeStates();
    setWorkflowStatus("executing"); // Local immediate update

    return executeWorkflow(workflowId, (execution: WorkflowExecution) => {
      // Only update status if the new status is not 'idle' while we are 'executing',
      // or if the local status is not 'executing' anymore (e.g., already completed/errored).
      setWorkflowStatus((currentStatus) => {
        if (currentStatus === "executing" && execution.status === "idle") {
          return currentStatus; // Ignore initial idle updates while executing
        }
        return execution.status; // Apply other status updates
      });

      execution.nodeExecutions.forEach((nodeExecution) => {
        updateNodeExecution(nodeExecution.nodeId, {
          state: nodeExecution.status,
          outputs: nodeExecution.outputs || {},
          error: nodeExecution.error,
        });
      });

      if (execution.status === "error") {
        setErrorDialogState({
          open: true,
          message: execution.nodeExecutions.find(n => n.error)?.error || "Unknown error",
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
        case "executing": {
          if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
          }
          break;
        }
        case "completed":
        case "error": {
          resetNodeStates();
          setWorkflowStatus("idle");
          break;
        }
        case "cancelled": {
          resetNodeStates();
          setWorkflowStatus("idle");
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

  return (
    <ReactFlowProvider>
      <WorkflowProvider
        updateNodeData={readonly ? undefined : updateNodeData}
        updateEdgeData={readonly ? undefined : updateEdgeData}
        readonly={readonly}
      >
        <div className="w-full h-full flex">
          <div
            className={`h-full overflow-hidden relative ${isSidebarVisible ? "w-[calc(100%-384px)]" : "w-full"}`}
          >
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              connectionValidationState={connectionValidationState}
              onNodesChange={readonly ? () => {} : handleNodesChange}
              onEdgesChange={readonly ? () => {} : handleEdgesChange}
              onConnect={readonly ? () => {} : onConnect}
              onConnectStart={readonly ? () => {} : onConnectStart}
              onConnectEnd={readonly ? () => {} : onConnectEnd}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onPaneClick={handlePaneClick}
              onInit={setReactFlowInstance}
              onAddNode={readonly ? undefined : handleAddNode}
              onAction={
                !readonly && executeWorkflow
                  ? handleActionButtonClick
                  : undefined
              }
              workflowStatus={workflowStatus}
              onToggleSidebar={toggleSidebar}
              isSidebarVisible={isSidebarVisible}
              isValidConnection={isValidConnection}
              readonly={readonly}
            />
          </div>

          {isSidebarVisible && (
            <div className="w-96">
              <WorkflowSidebar
                node={handleSelectedNode}
                edge={handleSelectedEdge}
                onNodeUpdate={readonly ? undefined : updateNodeData}
                onEdgeUpdate={readonly ? undefined : updateEdgeData}
                readonly={readonly}
              />
            </div>
          )}

          <WorkflowNodeSelector
            open={readonly ? false : handleIsNodeSelectorOpen}
            onSelect={handleNodeSelect}
            onClose={() => handleSetIsNodeSelectorOpen(false)}
            templates={nodeTemplates}
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
