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
import { Plus, Play, X, PanelLeftClose, PanelLeft, Square, Lightbulb } from "lucide-react";
import { useState } from "react";
import { WorkflowVideoPlayer } from "./workflow-video-player";
import "reactflow/dist/style.css";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const edgeTypes = {
  workflowEdge: WorkflowEdge,
};

const INSPIRATION_VIDEO_IDS = ["K0HSD_i2DvA", "D8K90hX4PrE"];

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
  onAction,
  workflowStatus = "idle",
  onToggleSidebar,
  isSidebarVisible,
  showControls = true,
}: WorkflowCanvasProps) {
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  // Function to get the action button icon based on workflow status
  const getActionIcon = () => {
    switch (workflowStatus) {
      case "executing":
        return <Square className="w-6 h-6" />;
      case "completed":
        return <X className="w-6 h-6" />;
      case "idle":
      default:
        return <Play className="w-6 h-6" />;
    }
  };

  // Function to get the action button title based on workflow status
  const getActionTitle = () => {
    switch (workflowStatus) {
      case "executing":
        return "Stop Execution";
      case "completed":
        return "Clear Outputs & Reset";
      case "idle":
      default:
        return "Execute Workflow";
    }
  };

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
      {showControls && <Controls showInteractive={false} showZoom={false} showFitView={false} />}
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
      {onAction && (
        <Button
          onClick={onAction}
          className={`absolute top-4 right-16 z-50 rounded-full shadow-lg h-10 w-10 p-0 ${
            workflowStatus === "idle"
              ? "bg-green-600 hover:bg-green-700"
              : workflowStatus === "executing"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700"
          }`}
          title={getActionTitle()}
        >
          {getActionIcon()}
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
      
      {/* Inspiration Button */}
      {!isVideoVisible && (
        <Button
          onClick={() => setIsVideoVisible(!isVideoVisible)}
          className="absolute bottom-4 left-4 z-50 rounded-full shadow-lg h-10 w-10 p-0 bg-amber-500 hover:bg-amber-600"
          title={isVideoVisible ? "Hide Inspiration" : "Show Inspiration"}
        >
          <Lightbulb className="w-6 h-6" />
        </Button>
      )}
      
      {/* Video Player */}
      {isVideoVisible && (
        <WorkflowVideoPlayer 
          className="absolute bottom-4 left-4 z-50 shadow-lg rounded-md overflow-hidden bg-black"
          videoId={INSPIRATION_VIDEO_IDS[Math.floor(Math.random() * INSPIRATION_VIDEO_IDS.length)]} 
          onClose={() => setIsVideoVisible(false)}
        />
      )}
    </ReactFlow>
  );
}
