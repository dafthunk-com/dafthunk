import { ReactFlowProvider } from "reactflow";
import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { useWorkflowState } from "./useWorkflowState";
import { useWorkflowExecution, ExecutionEvent } from "./useWorkflowExecution";
import { WorkflowCanvas } from "./workflow-canvas";
import { NodeTemplate } from "./workflow-node-selector";

export interface WorkflowBuilderProps {
  workflowId: string;
  initialNodes?: any[];
  initialEdges?: any[];
  nodeTemplates?: NodeTemplate[];
  onNodesChange?: (nodes: any[]) => void;
  onEdgesChange?: (edges: any[]) => void;
  validateConnection?: (connection: any) => boolean;
  executeWorkflow?: (
    workflowId: string,
    callbacks: {
      onEvent: (event: ExecutionEvent) => void;
      onComplete: () => void;
      onError: (error: string) => void;
    }
  ) => void | (() => void);
  onExecutionStart?: () => void;
  onExecutionComplete?: () => void;
  onExecutionError?: (error: string) => void;
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, outputs?: Record<string, any>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
}

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

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex">
        <div
          className={`h-full rounded-xl overflow-hidden relative ${
            selectedNode || selectedEdge ? "w-[calc(100%-320px)]" : "w-full"
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
          />
        </div>

        {(selectedNode || selectedEdge) && (
          <div className="w-80">
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
    </ReactFlowProvider>
  );
} 