import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { useWorkflowState } from "./useWorkflowState";
import { useWorkflowExecution } from "./useWorkflowExecution";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowBuilderProps } from "./workflow-types";

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

  const { handleExecute } = useWorkflowExecution({
    workflowId,
    updateNodeExecutionState,
    updateNodeData,
    updateNodeOutputs,
    onExecutionStart,
    onExecutionComplete,
    onExecutionError,
    onNodeStart,
    onNodeComplete,
    onNodeError,
    executeWorkflow,
  });

  const handleExecuteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Reset all nodes to idle state before execution
    nodes.forEach((node) => {
      updateNodeExecutionState(node.id, "idle");
    });
    handleExecute();
  };

  const handleCleanClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
  };

  return (
    <div className="w-full h-full flex">
      <div
        className={`h-full rounded-xl overflow-hidden relative ${
          selectedNode || selectedEdge ? "w-[calc(100%-384px)]" : "w-full"
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
          onExecute={handleExecuteClick}
          onClean={handleCleanClick}
        />
      </div>

      {(selectedNode || selectedEdge) && (
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
  );
}
