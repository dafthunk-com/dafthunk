import { Workflow, NodeType } from "@/lib/workflowTypes";
import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { useWorkflowState } from "./useWorkflowState";
import { useWorkflowExecution } from "./useWorkflowExecution";
import { useParams } from "react-router-dom";
import { WorkflowCanvas } from "./workflow-canvas";

interface WorkflowBuilderProps {
  initialWorkflow: Workflow;
  nodeTemplates: NodeType[];
  onWorkflowChange?: (workflow: Workflow) => void;
}

export function WorkflowBuilder({
  initialWorkflow: initialWorkflow,
  nodeTemplates,
  onWorkflowChange,
}: WorkflowBuilderProps) {
  const params = useParams();
  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
    onNodesChange,
    onEdgesChange,
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
  } = useWorkflowState({
    initialWorkflow: initialWorkflow,
    onWorkflowChange,
  });

  const { handleExecute } = useWorkflowExecution({
    workflowId: params.id!,
    updateNodeExecutionState,
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
    <div className="w-full h-full flex">
      <div
        className={`h-full rounded-xl overflow-hidden relative ${selectedNode || selectedEdge ? "w-[calc(100%-320px)]" : "w-full"}`}
      >
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          connectionValidationState={connectionValidationState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
          <WorkflowSidebar node={selectedNode} edge={selectedEdge} />
        </div>
      )}

      <WorkflowNodeSelector
        open={isNodeSelectorOpen}
        onSelect={handleNodeSelect}
        onClose={() => setIsNodeSelectorOpen(false)}
        nodeTemplates={nodeTemplates}
      />
    </div>
  );
}
