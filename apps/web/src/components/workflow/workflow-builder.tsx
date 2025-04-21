import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { useWorkflowState } from "./useWorkflowState";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowBuilderProps } from "./workflow-types";
import { useEffect, useState, useRef } from "react";
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
import {
  WorkflowExecutionStatus,
  WorkflowExecution,
} from "../../../../api/src/types";

export function WorkflowBuilder({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  nodeTemplates = [],
  onNodesChange,
  onEdgesChange,
  validateConnection,
  executeWorkflow,
  onExecutionStart,
  onExecutionComplete,
  onExecutionError,
}: WorkflowBuilderProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [workflowStatus, setWorkflowStatus] =
    useState<WorkflowExecutionStatus>("idle");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
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

  // Keep the connection state effect as is
  useEffect(() => {
    // Create separate maps to track input and output connections
    const connectedInputs = new Map();
    const connectedOutputs = new Map();

    // Collect all connections from edges
    edges.forEach((edge) => {
      if (edge.targetHandle) {
        connectedInputs.set(`${edge.target}-${edge.targetHandle}`, true);
      }
      if (edge.sourceHandle) {
        connectedOutputs.set(`${edge.source}-${edge.sourceHandle}`, true);
      }
    });

    // Update nodes with connection information
    nodes.forEach((node) => {
      const inputs = node.data.inputs.map((input) => ({
        ...input,
        isConnected: connectedInputs.has(`${node.id}-${input.id}`),
      }));

      const outputs = node.data.outputs.map((output) => ({
        ...output,
        isConnected: connectedOutputs.has(`${node.id}-${output.id}`),
      }));

      // Only update if there's a change to avoid infinite loops
      const inputChanged = inputs.some(
        (input, i) => input.isConnected !== node.data.inputs[i].isConnected
      );

      const outputChanged = outputs.some(
        (output, i) => output.isConnected !== node.data.outputs[i].isConnected
      );

      if (inputChanged || outputChanged) {
        updateNodeData(node.id, { inputs, outputs });
      }
    });
  }, [edges, nodes]);

  const handleExecute = () => {
    if (!executeWorkflow) return;

    // Reset all nodes to idle state before execution
    nodes.forEach((node) => {
      updateNodeExecutionState(node.id, "idle");
      updateNodeData(node.id, {
        outputs: node.data.outputs.map((output) => ({
          ...output,
          value: undefined,
        })),
        error: undefined,
      });
    });

    setWorkflowStatus("executing");
    onExecutionStart?.();

    const cleanup = executeWorkflow(
      workflowId,
      (execution: WorkflowExecution) => {
        // Update workflow status
        setWorkflowStatus(execution.status);

        // Update all nodes based on execution state
        execution.nodeExecutions.forEach((nodeExecution) => {
          updateNodeExecutionState(nodeExecution.nodeId, nodeExecution.status);

          if (nodeExecution.outputs) {
            updateNodeData(nodeExecution.nodeId, {
              outputs:
                nodes
                  .find((n) => n.id === nodeExecution.nodeId)
                  ?.data.outputs.map((output) => ({
                    ...output,
                    value: nodeExecution.outputs?.[output.id],
                  })) || [],
            });
          }

          if (nodeExecution.error) {
            updateNodeData(nodeExecution.nodeId, {
              error: nodeExecution.error,
            });
          }
        });

        // Handle workflow completion
        if (execution.status === "completed") {
          onExecutionComplete?.();
        } else if (execution.status === "error") {
          setErrorMessage(execution.error || "Unknown error");
          setErrorDialogOpen(true);
          onExecutionError?.(execution.error || "Unknown error");
        }
      }
    );

    return cleanup;
  };

  const handleActionButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    switch (workflowStatus) {
      case "idle":
        // Start execution
        const cleanup = handleExecute();
        if (typeof cleanup === "function") {
          cleanupRef.current = cleanup;
        }
        break;

      case "executing":
        // Stop the execution
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
        setWorkflowStatus("completed");
        break;

      case "completed":
      case "error":
        // Reset to idle state
        nodes.forEach((node) => {
          updateNodeExecutionState(node.id, "idle");
          updateNodeData(node.id, {
            outputs: node.data.outputs.map((output) => ({
              ...output,
              value: undefined,
            })),
            error: undefined,
          });
        });
        setWorkflowStatus("idle");
        break;
    }
  };

  const handleToggleSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <ReactFlowProvider>
      <WorkflowProvider
        updateNodeData={updateNodeData}
        updateEdgeData={updateEdgeData}
      >
        <div className="w-full h-full flex">
          <div
            className={`h-full rounded-xl overflow-hidden relative ${
              isSidebarVisible ? "w-[calc(100%-384px)]" : "w-full"
            }`}
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
              onToggleSidebar={handleToggleSidebar}
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

        {/* Error Dialog */}
        <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Workflow Execution Error</DialogTitle>
              <DialogDescription>{errorMessage}</DialogDescription>
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
