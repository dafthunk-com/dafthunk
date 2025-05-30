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
  Eye,
  EyeOff,
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

interface ActionBarButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  tooltip: string;
  children: React.ReactNode;
  position?: "first" | "middle" | "last" | "only";
}

function ActionBarButton({
  onClick,
  disabled = false,
  className = "",
  tooltip,
  children,
  position = "middle",
}: ActionBarButtonProps) {
  const roundingClass = {
    first: "rounded-l-lg rounded-r-none",
    middle: "rounded-none border-l-0",
    last: "rounded-r-lg rounded-l-none border-l-0",
    only: "rounded-lg",
  }[position];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "h-10 px-3 border-neutral-300 shadow-sm",
            roundingClass,
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
      icon: <Play className="!size-4" />,
      title: "Execute Workflow",
      className: "bg-green-600 hover:bg-green-700 text-white border-green-600",
    },
    submitted: {
      icon: <Square className="!size-4" />,
      title: "Stop Execution",
      className: "bg-red-500 hover:bg-red-600 text-white border-red-500",
    },
    executing: {
      icon: <Square className="!size-4" />,
      title: "Stop Execution",
      className: "bg-red-500 hover:bg-red-600 text-white border-red-500",
    },
    completed: {
      icon: <X className="!size-4" />,
      title: "Clear Outputs & Reset",
      className:
        "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
    },
    error: {
      icon: <X className="!size-4" />,
      title: "Clear Errors & Reset",
      className: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600",
    },
    cancelled: {
      icon: <Play className="!size-4" />,
      title: "Restart Workflow",
      className:
        "bg-neutral-600 hover:bg-neutral-700 text-white border-neutral-600",
    },
    paused: {
      icon: <Play className="!size-4" />,
      title: "Resume Workflow",
      className: "bg-blue-500 hover:bg-blue-600 text-white border-blue-500",
    },
  };

  // Use a default config if the status isn't in our mapping
  const config = statusConfig[workflowStatus] || statusConfig.idle;

  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={config.className}
      tooltip={config.title}
      position="first"
    >
      {config.icon}
    </ActionBarButton>
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
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
      tooltip="Deploy Workflow"
      position="middle"
    >
      <ArrowUpToLine className="!size-4" />
    </ActionBarButton>
  );
}

type SidebarToggleProps = {
  onClick: (e: React.MouseEvent) => void;
  isSidebarVisible: boolean;
};

function SidebarToggle({ onClick, isSidebarVisible }: SidebarToggleProps) {
  return (
    <ActionBarButton
      onClick={onClick}
      tooltip={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
      className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300"
      position="last"
    >
      {isSidebarVisible ? (
        <PanelLeftClose className="!size-4 rotate-180" />
      ) : (
        <PanelLeft className="!size-4 rotate-180" />
      )}
    </ActionBarButton>
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
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className="bg-neutral-600 hover:bg-neutral-700 text-white border-neutral-600"
      tooltip={
        disabled
          ? "No outputs to show"
          : expandedOutputs
            ? "Hide All Outputs"
            : "Show All Outputs"
      }
      position="middle"
    >
      {expandedOutputs ? (
        <EyeOff className="!size-4" />
      ) : (
        <Eye className="!size-4" />
      )}
    </ActionBarButton>
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

        {/* Main Action Bar */}
        {((!readonly && (onAction || onDeploy || onToggleExpandedOutputs)) ||
          onToggleSidebar) && (
          <div className="absolute top-4 right-4 flex items-center rounded-lg shadow-lg bg-background z-50 overflow-hidden">
            {!readonly && onAction && (
              <ActionButton
                onClick={onAction}
                workflowStatus={workflowStatus}
                disabled={nodes.length === 0}
              />
            )}

            {!readonly && onToggleExpandedOutputs && (
              <OutputsToggle
                onClick={onToggleExpandedOutputs}
                expandedOutputs={expandedOutputs}
                disabled={!hasAnyOutputs}
              />
            )}

            {!readonly && onDeploy && (
              <DeployButton onClick={onDeploy} disabled={nodes.length === 0} />
            )}

            {onToggleSidebar && isSidebarVisible !== undefined && (
              <SidebarToggle
                onClick={onToggleSidebar}
                isSidebarVisible={isSidebarVisible}
              />
            )}
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
            <Plus className="!size-5" />
          </CanvasButton>
        )}
      </ReactFlow>
    </TooltipProvider>
  );
}
