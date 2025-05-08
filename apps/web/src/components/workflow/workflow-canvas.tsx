import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { WorkflowNode } from "./workflow-node";
import { WorkflowEdge, WorkflowConnectionLine } from "./workflow-edge";
import { WorkflowCanvasProps } from "./workflow-types";
import { Plus, Play, X, PanelLeftClose, PanelLeft, Square, ArrowUpToLine } from "lucide-react";
import { cn } from "@/utils/utils";
import "@xyflow/react/dist/style.css";
import { WorkflowExecutionStatus } from "@dafthunk/types";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const edgeTypes = {
  workflowEdge: WorkflowEdge,
};

type ActionButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  workflowStatus: WorkflowExecutionStatus;
};

function ActionButton({ onClick, workflowStatus }: ActionButtonProps) {
  const statusConfig = {
    idle: {
      icon: <Play className="w-6 h-6" />,
      title: "Execute Workflow",
      className: "bg-green-600 hover:bg-green-700 text-white",
    },
    executing: {
      icon: <Square className="w-6 h-6" />,
      title: "Stop Execution",
      className: "bg-red-500 hover:bg-red-600 text-white",
    },
    completed: {
      icon: <X className="w-6 h-6" />,
      title: "Clear Outputs & Reset",
      className: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    error: {
      icon: <X className="w-6 h-6" />,
      title: "Clear Errors & Reset",
      className: "bg-yellow-600 hover:bg-yellow-700 text-white",
    },
    cancelled: {
      icon: <Play className="w-6 h-6" />,
      title: "Restart Workflow",
      className: "bg-neutral-600 hover:bg-neutral-700 text-white",
    },
    paused: {
      icon: <Play className="w-6 h-6" />,
      title: "Resume Workflow",
      className: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  };

  // Use a default config if the status isn't in our mapping
  const config = statusConfig[workflowStatus] || statusConfig.idle;

  return (
    <Button
      onClick={onClick}
      className={cn(
        "absolute top-4 right-28 z-50 rounded-full shadow-lg h-10 w-10 p-0",
        config.className
      )}
      title={config.title}
    >
      {config.icon}
    </Button>
  );
}

function DeployButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <Button
      onClick={onClick}
      className="absolute top-4 right-16 z-50 rounded-full shadow-lg h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700 text-white"
      title="Deploy Workflow"
    >
      <ArrowUpToLine className="w-6 h-6" />
    </Button>
  );
}

type SidebarToggleProps = {
  onClick: (e: React.MouseEvent) => void;
  isSidebarVisible: boolean;
};

function SidebarToggle({ onClick, isSidebarVisible }: SidebarToggleProps) {
  return (
    <Button
      onClick={onClick}
      className="absolute top-4 right-4 z-50 rounded-full shadow-lg h-10 w-10 p-0"
      title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
    >
      {isSidebarVisible ? (
        <PanelLeftClose className="w-6 h-6" />
      ) : (
        <PanelLeft className="w-6 h-6" />
      )}
    </Button>
  );
}

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
  onDeploy,
  workflowStatus = "idle",
  onToggleSidebar,
  isSidebarVisible,
  showControls = true,
  isValidConnection,
  readonly = false,
}: WorkflowCanvasProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={readonly ? () => {} : onNodesChange}
      onEdgesChange={readonly ? () => {} : onEdgesChange}
      onConnect={readonly ? () => {} : onConnect}
      onConnectStart={readonly ? () => {} : onConnectStart}
      onConnectEnd={readonly ? () => {} : onConnectEnd}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionMode={ConnectionMode.Strict}
      connectionLineComponent={WorkflowConnectionLine}
      connectionRadius={8}
      onInit={onInit}
      isValidConnection={isValidConnection}
      fitView
      className={cn("bg-neutral-100/50", {
        "cursor-default": readonly,
      })}
      nodesDraggable={!readonly}
      nodesConnectable={!readonly}
      elementsSelectable={true}
      selectNodesOnDrag={!readonly}
      panOnDrag={true}
    >
      {showControls && (
        <Controls
          showInteractive={false}
          showZoom={false}
          showFitView={false}
        />
      )}
      <Background
        variant={BackgroundVariant.Dots}
        gap={12}
        size={1}
        className="stroke-foreground/5 opacity-50"
      />

      {readonly && (
        <div className="absolute top-4 left-4 bg-amber-100 px-3 py-1 rounded-md text-amber-800 text-sm font-medium shadow-sm border border-amber-200 z-50">
          Read-only Mode
        </div>
      )}

      {onAddNode && !readonly && (
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

      {onAction && !readonly && (
        <ActionButton onClick={onAction} workflowStatus={workflowStatus} />
      )}

      {onDeploy && !readonly && (
        <DeployButton onClick={onDeploy} />
      )}

      {onToggleSidebar && isSidebarVisible !== undefined && (
        <SidebarToggle
          onClick={onToggleSidebar}
          isSidebarVisible={isSidebarVisible}
        />
      )}
    </ReactFlow>
  );
}
