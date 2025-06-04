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
  Maximize,
  PanelLeft,
  PanelLeftClose,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect } from "react";

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

interface StatusBarProps {
  workflowStatus: WorkflowExecutionStatus;
  nodeCount: number;
  readonly?: boolean;
}

function StatusBar({ workflowStatus, nodeCount, readonly }: StatusBarProps) {
  const statusConfig = {
    idle: { color: "text-gray-600", bg: "bg-gray-100", label: "Ready" },
    submitted: {
      color: "text-orange-600",
      bg: "bg-orange-100",
      label: "Queued",
    },
    executing: {
      color: "text-yellow-600",
      bg: "bg-yellow-400",
      label: "Running",
    },
    completed: {
      color: "text-green-600",
      bg: "bg-green-100",
      label: "Completed",
    },
    error: { color: "text-red-600", bg: "bg-red-100", label: "Error" },
    cancelled: {
      color: "text-neutral-600",
      bg: "bg-neutral-100",
      label: "Cancelled",
    },
    paused: { color: "text-blue-600", bg: "bg-blue-100", label: "Paused" },
  };

  const config = statusConfig[workflowStatus] || statusConfig.idle;

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-3 z-50">
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-sm flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", config.bg)}>
            <div
              className={cn(
                "w-full h-full rounded-full",
                config.color.replace("text-", "bg-")
              )}
            />
          </div>
          <span className={cn("text-sm font-medium", config.color)}>
            {config.label}
          </span>
        </div>

        <div className="w-px h-4 bg-gray-300" />

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            {nodeCount} node{nodeCount !== 1 ? "s" : ""}
          </span>
          {readonly && (
            <>
              <span>•</span>
              <span className="text-amber-600">Read-only</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface ActionBarGroupProps {
  children: React.ReactNode;
}

function ActionBarGroup({ children }: ActionBarGroupProps) {
  return (
    <div className="flex items-center gap-0.5 [&>*:first-child]:rounded-l-lg [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-r-lg [&>*:last-child]:rounded-l-none [&>*:only-child]:rounded-lg">
      {children}
    </div>
  );
}

interface ActionBarButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  tooltip: React.ReactNode;
  children: React.ReactNode;
}

function ActionBarButton({
  onClick,
  disabled = false,
  className = "",
  tooltip,
  children,
}: ActionBarButtonProps) {
  return (
    <Tooltip delayDuration={0}>
      <div className="bg-background rounded-none overflow-hidden">
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            disabled={disabled}
            className={cn("h-10 px-3 rounded-none", className, {
              "opacity-50 cursor-not-allowed": disabled,
            })}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </div>
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
  onFitToScreen?: (e: React.MouseEvent) => void;
  selectedNode?: ReactFlowNode<WorkflowNodeType> | null;
  selectedEdge?: ReactFlowEdge<WorkflowEdgeType> | null;
  onDeleteSelected?: (e: React.MouseEvent) => void;
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
      shortcut: "⌘⏎",
      className: "bg-green-600 hover:bg-green-700 text-white border-green-600",
    },
    submitted: {
      icon: <Square className="!size-4" />,
      title: "Stop Execution",
      shortcut: "⌘⏎",
      className: "bg-red-500 hover:bg-red-600 text-white border-red-500",
    },
    executing: {
      icon: <Square className="!size-4" />,
      title: "Stop Execution",
      shortcut: "⌘⏎",
      className: "bg-red-500 hover:bg-red-600 text-white border-red-500",
    },
    completed: {
      icon: <X className="!size-4" />,
      title: "Clear Outputs & Reset",
      shortcut: "⌘⏎",
      className: "bg-green-600 hover:bg-green-700 text-white border-green-600",
    },
    error: {
      icon: <X className="!size-4" />,
      title: "Clear Errors & Reset",
      shortcut: "⌘⏎",
      className: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600",
    },
    cancelled: {
      icon: <Play className="!size-4" />,
      title: "Restart Workflow",
      shortcut: "⌘⏎",
      className: "bg-green-600 hover:bg-green-700 text-white border-green-600",
    },
    paused: {
      icon: <Play className="!size-4" />,
      title: "Resume Workflow",
      shortcut: "⌘⏎",
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
      tooltip={
        <div className="flex items-center gap-2">
          <span>{config.title}</span>
          <div className="flex items-center gap-1">
            {config.shortcut.split("").map((key) => (
              <kbd
                key={key}
                className="px-1 py-0.25 text-xs rounded border font-mono"
              >
                {key}
              </kbd>
            ))}
          </div>
        </div>
      }
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
      tooltip={<p>Deploy Workflow</p>}
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
      tooltip={<p>{isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}</p>}
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
  const tooltipText = disabled
    ? "No outputs to show"
    : expandedOutputs
      ? "Hide All Outputs"
      : "Show All Outputs";

  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className="bg-neutral-500 hover:bg-neutral-600 text-white border-neutral-500"
      tooltip={<p>{tooltipText}</p>}
    >
      {expandedOutputs ? (
        <EyeOff className="!size-4" />
      ) : (
        <Eye className="!size-4" />
      )}
    </ActionBarButton>
  );
}

function FitToScreenButton({
  onClick,
}: {
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      className="bg-neutral-500 hover:bg-neutral-600 text-white border-neutral-500"
      tooltip={<p>Fit to Screen</p>}
    >
      <Maximize className="!size-4" />
    </ActionBarButton>
  );
}

function DeleteButton({
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
      className="bg-red-500 hover:bg-red-600 text-white border-red-500"
      tooltip={<p>Delete Selected</p>}
    >
      <Trash2 className="!size-4" />
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
  onFitToScreen,
  selectedNode,
  selectedEdge,
  onDeleteSelected,
}: WorkflowCanvasProps) {
  // Check if any nodes have output values
  const hasAnyOutputs = nodes.some((node) =>
    node.data.outputs.some((output) => output.value !== undefined)
  );

  // Keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) - Execute workflow
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (onAction && !readonly && nodes.length > 0) {
          const syntheticEvent = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
          }) as unknown as React.MouseEvent;
          onAction(syntheticEvent);
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onAction, readonly, nodes.length]);

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
        fitViewOptions={{
          padding: 0.25,
        }}
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

        {/* Status Bar */}
        <StatusBar
          workflowStatus={workflowStatus}
          nodeCount={nodes.length}
          readonly={readonly}
        />

        {/* Action Bars */}
        {((!readonly &&
          (onAction ||
            onDeploy ||
            onToggleExpandedOutputs ||
            (onToggleSidebar && isSidebarVisible !== undefined))) ||
          (readonly &&
            (onToggleExpandedOutputs ||
              (onToggleSidebar && isSidebarVisible !== undefined)))) && (
          <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
            {/* Run/Deploy Group - only shown when not readonly */}
            {!readonly && (onAction || onDeploy) && (
              <ActionBarGroup>
                {onAction && (
                  <ActionButton
                    onClick={onAction}
                    workflowStatus={workflowStatus}
                    disabled={nodes.length === 0}
                  />
                )}

                {onDeploy && (
                  <DeployButton
                    onClick={onDeploy}
                    disabled={nodes.length === 0}
                  />
                )}
              </ActionBarGroup>
            )}

            {/* Preview/Sidebar Group - shown in both readonly and editable modes */}
            {(onFitToScreen ||
              onToggleExpandedOutputs ||
              (onToggleSidebar && isSidebarVisible !== undefined)) && (
              <ActionBarGroup>
                {onFitToScreen && <FitToScreenButton onClick={onFitToScreen} />}

                {onToggleExpandedOutputs && (
                  <OutputsToggle
                    onClick={onToggleExpandedOutputs}
                    expandedOutputs={expandedOutputs}
                    disabled={!hasAnyOutputs}
                  />
                )}

                {onToggleSidebar && isSidebarVisible !== undefined && (
                  <SidebarToggle
                    onClick={onToggleSidebar}
                    isSidebarVisible={isSidebarVisible}
                  />
                )}
              </ActionBarGroup>
            )}
          </div>
        )}

        {onAddNode && !readonly && (
          <div
            className={cn(
              "absolute top-4 left-4 z-50 flex flex-col items-center gap-0.5",
              "[&>*:first-child]:rounded-t-lg [&>*:first-child]:rounded-b-none",
              "[&>*:last-child]:rounded-b-lg [&>*:last-child]:rounded-t-none",
              "[&>*:only-child]:rounded-lg"
            )}
          >
            <ActionBarButton
              onClick={onAddNode}
              tooltip="Add Node"
              className="size-10 !p-0"
            >
              <Plus className="!size-5" />
            </ActionBarButton>
            {onDeleteSelected && (
              <DeleteButton
                onClick={onDeleteSelected}
                disabled={readonly || (!selectedNode && !selectedEdge)}
              />
            )}
          </div>
        )}
      </ReactFlow>
    </TooltipProvider>
  );
}
