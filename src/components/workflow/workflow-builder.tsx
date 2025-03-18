import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { useWorkflowState } from "./useWorkflowState";
import { useWorkflowExecution } from "./useWorkflowExecution";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowBuilderProps } from "./workflow-types";
import { useEffect, useState, useRef } from "react";
import { ReactFlowProvider } from "reactflow";
import { WorkflowProvider } from "./workflow-context";

// Define workflow status states
type WorkflowStatus = "idle" | "executing" | "completed";

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
  onNodeStart,
  onNodeComplete,
  onNodeError,
}: WorkflowBuilderProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("idle");
  const cleanupRef = useRef<(() => void) | null>(null);

  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
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
    updateNodeData,
    updateNodeOutputs,
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
    // Create a map to track connected parameters
    const connectedParams = new Map();

    // Collect all connections from edges
    edges.forEach((edge) => {
      if (edge.targetHandle) {
        connectedParams.set(`${edge.target}-${edge.targetHandle}`, true);
      }
      if (edge.sourceHandle) {
        connectedParams.set(`${edge.source}-${edge.sourceHandle}`, true);
      }
    });

    // Update nodes with connection information
    nodes.forEach((node) => {
      const inputs = node.data.inputs.map((input) => ({
        ...input,
        isConnected: connectedParams.has(`${node.id}-${input.id}`),
      }));

      const outputs = node.data.outputs.map((output) => ({
        ...output,
        isConnected: connectedParams.has(`${node.id}-${output.id}`),
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

  const { handleExecute } = useWorkflowExecution({
    workflowId,
    updateNodeExecutionState,
    updateNodeData,
    updateNodeOutputs,
    onExecutionStart: () => {
      setWorkflowStatus("executing");
      onExecutionStart?.();
    },
    onExecutionComplete: () => {
      setWorkflowStatus("completed");
      onExecutionComplete?.();
    },
    onExecutionError: (error) => {
      setWorkflowStatus("completed");
      onExecutionError?.(error);
    },
    onNodeStart,
    onNodeComplete,
    onNodeError,
    executeWorkflow,
  });

  const handleActionButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    switch (workflowStatus) {
      case "idle":
        // Execute workflow
        // Reset all nodes to idle state before execution
        nodes.forEach((node) => {
          updateNodeExecutionState(node.id, "idle");
        });

        // Execute and store cleanup function if returned
        const cleanup = handleExecute();
        if (typeof cleanup === "function") {
          cleanupRef.current = cleanup;
        }
        break;

      case "executing":
        // Stop the execution but keep the outputs
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }

        // Update workflow status to completed
        setWorkflowStatus("completed");
        break;

      case "completed":
        // Clean up outputs and reset to idle
        // Reset all nodes to idle state
        nodes.forEach((node) => {
          // Reset execution state to idle
          updateNodeExecutionState(node.id, "idle");

          // Update node data to clear output values and error
          updateNodeData(node.id, {
            outputs: node.data.outputs.map((output) => ({
              ...output,
              value: undefined,
            })),
            error: null,
          });
        });

        // Reset workflow status to idle
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
            />
          </div>

          {isSidebarVisible && (
            <div className="w-96">
              <WorkflowSidebar
                node={selectedNode}
                edge={selectedEdge}
                onNodeUpdate={updateNodeData}
                onEdgeUpdate={updateEdgeData}
              />
            </div>
          )}

          <WorkflowNodeSelector
            open={isNodeSelectorOpen}
            onSelect={handleNodeSelect}
            onClose={() => setIsNodeSelectorOpen(false)}
            templates={nodeTemplates}
          />
        </div>
      </WorkflowProvider>
    </ReactFlowProvider>
  );
}
