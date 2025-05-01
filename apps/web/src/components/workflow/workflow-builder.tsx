import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { useWorkflowState } from "./useWorkflowState";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowBuilderProps } from "./workflow-types";
import { useEffect, useState, useRef, useCallback } from "react";
import { ReactFlowProvider } from "reactflow";
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
import { WorkflowExecutionStatus, WorkflowExecution } from "@dafthunk/types";

export function WorkflowBuilder({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  nodeTemplates = [],
  onNodesChange,
  onEdgesChange,
  validateConnection,
  executeWorkflow,
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
    updateNodeExecutionState,
    updateNodeExecutionOutputs,
    updateNodeExecutionError,
    setReactFlowInstance,
    connectionValidationState,
    isValidConnection,
    updateNodeData,
    updateEdgeData,
  } = useWorkflowState({
    initialNodes,
    initialEdges,
    onNodesChange,
    onEdgesChange,
    validateConnection,
  });

  // Track input and output connections
  useEffect(() => {
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
  }, [edges, nodes, updateNodeData]);

  const resetNodeStates = useCallback(() => {
    nodes.forEach((node) => {
      updateNodeExecutionState(node.id, "idle");
      updateNodeExecutionOutputs(node.id, {});
      updateNodeExecutionError(node.id, undefined);
    });
  }, [
    nodes,
    updateNodeExecutionState,
    updateNodeExecutionOutputs,
    updateNodeExecutionError,
  ]);

  const handleExecute = useCallback(() => {
    if (!executeWorkflow) return null;

    resetNodeStates();
    setWorkflowStatus("executing");

    return executeWorkflow(workflowId, (execution: WorkflowExecution) => {
      setWorkflowStatus(execution.status);

      execution.nodeExecutions.forEach((nodeExecution) => {
        updateNodeExecutionState(nodeExecution.nodeId, nodeExecution.status);

        if (nodeExecution.outputs) {
          updateNodeExecutionOutputs(
            nodeExecution.nodeId,
            nodeExecution.outputs
          );
        }

        if (nodeExecution.error) {
          updateNodeExecutionError(nodeExecution.nodeId, nodeExecution.error);
        }
      });

      if (execution.status === "error") {
        setErrorDialogState({
          open: true,
          message: execution.error || "Unknown error",
        });
      }
    });
  }, [
    executeWorkflow,
    workflowId,
    resetNodeStates,
    updateNodeExecutionState,
    updateNodeExecutionOutputs,
    updateNodeExecutionError,
  ]);

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
          setWorkflowStatus("completed");
          break;
        }
        case "completed":
        case "error": {
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
        updateNodeData={(nodeId, data) => {
          updateNodeData(nodeId, data);
        }}
        updateEdgeData={updateEdgeData}
      >
        <div className="w-full h-full flex">
          <div
            className={`h-full rounded-xl border border-gray-200 overflow-hidden relative ${isSidebarVisible ? "w-[calc(100%-384px)]" : "w-full"}`}
          >
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              connectionValidationState={connectionValidationState}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onPaneClick={handlePaneClick}
              onInit={setReactFlowInstance}
              onAddNode={handleAddNode}
              onAction={executeWorkflow ? handleActionButtonClick : undefined}
              workflowStatus={workflowStatus}
              onToggleSidebar={toggleSidebar}
              isSidebarVisible={isSidebarVisible}
              isValidConnection={isValidConnection}
            />
          </div>

          {isSidebarVisible && (
            <div className="w-96">
              <WorkflowSidebar
                node={handleSelectedNode}
                edge={handleSelectedEdge}
                onNodeUpdate={updateNodeData}
                onEdgeUpdate={updateEdgeData}
              />
            </div>
          )}

          <WorkflowNodeSelector
            open={handleIsNodeSelectorOpen}
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
