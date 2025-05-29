import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  Edge as ReactFlowEdge,
  IsValidConnection,
  Node as ReactFlowNode,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
  ReactFlowInstance,
} from "@xyflow/react";
import {
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  PanelLeft,
  PanelLeftClose,
  Play,
  Plus,
  Square,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/utils";

import { WorkflowConnectionLine, WorkflowEdge } from "./workflow-edge";
import { WorkflowNode } from "./workflow-node";
import type {
  ConnectionValidationState,
  WorkflowEdgeType,
  WorkflowExecutionStatus,
  WorkflowNodeType,
} from "./workflow-types";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const edgeTypes = {
  workflowEdge: WorkflowEdge,
};

interface CanvasButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  position: string;
  tooltip: string;
  children: React.ReactNode;
}

function CanvasButton({
  onClick,
  disabled = false,
  className = "",
  position,
  tooltip,
  children,
}: CanvasButtonProps) {
  const positionClass = position.startsWith("bottom-")
    ? `absolute bottom-4 ${position} z-50`
    : `absolute top-4 ${position} z-50`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "rounded-full h-10 w-10 p-0",
            positionClass,
            className,
            { "opacity-50 cursor-not-allowed": disabled }
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export interface WorkflowCanvasProps {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  connectionValidationState?: ConnectionValidationState;
  onNodesChange: OnNodesChange<ReactFlowNode<WorkflowNodeType>>;
  onEdgesChange: OnEdgesChange<ReactFlowEdge<WorkflowEdgeType>>;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onNodeClick: (
    event: React.MouseEvent,
    node: ReactFlowNode<WorkflowNodeType>
  ) => void;
  onEdgeClick: (
    event: React.MouseEvent,
    edge: ReactFlowEdge<WorkflowEdgeType>
  ) => void;
  onPaneClick: () => void;
  onInit: (
    instance: ReactFlowInstance<
      ReactFlowNode<WorkflowNodeType>,
      ReactFlowEdge<WorkflowEdgeType>
    >
  ) => void;
  onAddNode?: () => void;
  onAction?: (e: React.MouseEvent) => void;
  onDeploy?: (e: React.MouseEvent) => void;
  workflowStatus?: WorkflowExecutionStatus;
  onToggleSidebar?: (e: React.MouseEvent) => void;
  isSidebarVisible?: boolean;
  showControls?: boolean;
  isValidConnection?: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;
  readonly?: boolean;
  expandedOutputs?: boolean;
  onToggleExpandedOutputs?: (e: React.MouseEvent) => void;
}

type ActionButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  workflowStatus: WorkflowExecutionStatus;
  disabled?: boolean;
};

function ActionButton({
  onClick,
  workflowStatus,
  disabled,
}: ActionButtonProps) {
  const statusConfig = {
    idle: {
      icon: <Play className="w-6 h-6" />,
      title: "Execute Workflow",
      className: "bg-green-600 hover:bg-green-700 text-white",
    },
    submitted: {
      icon: <Square className="w-6 h-6" />,
      title: "Stop Execution",
      className: "bg-red-500 hover:bg-red-600 text-white",
    },
    executing: {
      icon: <Square className="w-6 h-6" />,
      title: "Stop Execution",
      className: "bg-red-500 hover:bg-red-600 text-white",
    },
    completed: {
      icon: <X className="w-6 h-6" />,
      title: "Clear Outputs & Reset",
      className: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    error: {
      icon: <X className="w-6 h-6" />,
      title: "Clear Errors & Reset",
      className: "bg-rose-600 hover:bg-rose-700 text-white",
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
    <CanvasButton
      onClick={onClick}
      disabled={disabled}
      className={config.className}
      position="right-28"
      tooltip={config.title}
    >
      {config.icon}
    </CanvasButton>
  );
}

function DeployButton({
  onClick,
  disabled,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <CanvasButton
      onClick={onClick}
      disabled={disabled}
      className="bg-blue-600 hover:bg-blue-700 text-white"
      position="right-16"
      tooltip="Deploy Workflow"
    >
      <ArrowUpToLine className="w-6 h-6" />
    </CanvasButton>
  );
}

type SidebarToggleProps = {
  onClick: (e: React.MouseEvent) => void;
  isSidebarVisible: boolean;
};

function SidebarToggle({ onClick, isSidebarVisible }: SidebarToggleProps) {
  return (
    <CanvasButton
      onClick={onClick}
      position="right-4"
      tooltip={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
    >
      {isSidebarVisible ? (
        <PanelLeftClose className="w-6 h-6" />
      ) : (
        <PanelLeft className="w-6 h-6" />
      )}
    </CanvasButton>
  );
}

function OutputsToggle({
  onClick,
  expandedOutputs,
  disabled,
}: {
  onClick: (e: React.MouseEvent) => void;
  expandedOutputs: boolean;
  disabled?: boolean;
}) {
  return (
    <CanvasButton
      onClick={onClick}
      disabled={disabled}
      className="bg-neutral-600 hover:bg-neutral-700 text-white"
      position="right-40"
      tooltip={
        disabled
          ? "No outputs to show"
          : expandedOutputs
            ? "Collapse All Outputs"
            : "Expand All Outputs"
      }
    >
      {expandedOutputs ? (
        <ChevronUp className="w-6 h-6" />
      ) : (
        <ChevronDown className="w-6 h-6" />
      )}
    </CanvasButton>
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
  expandedOutputs = false,
  onToggleExpandedOutputs,
}: WorkflowCanvasProps) {
  // Check if any nodes have output values
  const hasAnyOutputs = nodes.some((node) =>
    node.data.outputs.some((output) => output.value !== undefined)
  );

  return (
    <TooltipProvider>
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
        minZoom={0.05}
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
          <CanvasButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddNode();
            }}
            position="bottom-4 right-4"
            tooltip="Add Node"
          >
            <Plus className="w-6 h-6" />
          </CanvasButton>
        )}

        {onToggleExpandedOutputs && (
          <OutputsToggle
            onClick={onToggleExpandedOutputs}
            expandedOutputs={expandedOutputs}
            disabled={!hasAnyOutputs}
          />
        )}

        {onAction && !readonly && (
          <ActionButton
            onClick={onAction}
            workflowStatus={workflowStatus}
            disabled={nodes.length === 0}
          />
        )}

        {onDeploy && !readonly && (
          <DeployButton onClick={onDeploy} disabled={nodes.length === 0} />
        )}

        {onToggleSidebar && isSidebarVisible !== undefined && (
          <SidebarToggle
            onClick={onToggleSidebar}
            isSidebarVisible={isSidebarVisible}
          />
        )}
      </ReactFlow>
    </TooltipProvider>
  );
}
