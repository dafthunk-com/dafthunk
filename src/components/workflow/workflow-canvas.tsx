import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
} from "reactflow";
import { Button } from "@/components/ui/button";
import { WorkflowNode } from "./workflow-node";
import { WorkflowEdge, WorkflowConnectionLine } from "./workflow-edge";
import { WorkflowCanvasProps } from "./workflow-types";
import { Plus, Play, X, PanelLeftClose, PanelLeft, Square } from "lucide-react";
import "reactflow/dist/style.css";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const edgeTypes = {
  workflowEdge: WorkflowEdge,
};

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onInit,
  onAddNode,
  onExecute,
  onClean,
  onToggleSidebar,
  isSidebarVisible,
  isExecuting = false,
  showControls = true,
}: WorkflowCanvasProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionMode={ConnectionMode.Strict}
      connectionLineComponent={WorkflowConnectionLine}
      connectionRadius={8}
      onInit={onInit}
      fitView
      className="bg-gray-100"
    >
      {showControls && <Controls showInteractive={false} />}
      <Background
        variant={BackgroundVariant.Dots}
        gap={12}
        size={1}
        color="#d4d4d4"
      />
      {onAddNode && (
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddNode();
          }}
          className="absolute bottom-4 right-4 z-50 rounded-full shadow-lg h-10 w-10 p-0"
          title="Add Node"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}
      {onExecute && (
        <Button
          onClick={onExecute}
          className="absolute top-4 right-28 z-50 rounded-full shadow-lg h-10 w-10 p-0"
          title="Execute Workflow"
          disabled={isExecuting}
        >
          <Play className="w-6 h-6" />
        </Button>
      )}
      {onClean && (
        <Button
          onClick={onClean}
          className="absolute top-4 right-16 z-50 rounded-full shadow-lg h-10 w-10 p-0"
          title={isExecuting ? "Stop Execution" : "Clean Workflow"}
        >
          {isExecuting ? (
            <Square className="w-6 h-6" />
          ) : (
            <X className="w-6 h-6" />
          )}
        </Button>
      )}
      {onToggleSidebar && (
        <Button
          onClick={onToggleSidebar}
          className="absolute top-4 right-4 z-50 rounded-full shadow-lg h-10 w-10 p-0"
          title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
        >
          {isSidebarVisible ? (
            <PanelLeftClose className="w-6 h-6" />
          ) : (
            <PanelLeft className="w-6 h-6" />
          )}
        </Button>
      )}
    </ReactFlow>
  );
}
