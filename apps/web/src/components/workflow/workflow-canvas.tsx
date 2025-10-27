import "@xyflow/react/dist/style.css";

import { WorkflowType } from "@dafthunk/types";
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
import ArrowUpToLine from "lucide-react/icons/arrow-up-to-line";
import ClipboardPaste from "lucide-react/icons/clipboard-paste";
import Clock from "lucide-react/icons/clock";
import Copy from "lucide-react/icons/copy";
import Eye from "lucide-react/icons/eye";
import EyeOff from "lucide-react/icons/eye-off";
import FileText from "lucide-react/icons/file-text";
import Globe from "lucide-react/icons/globe";
import Layers2 from "lucide-react/icons/layers-2";
import Mail from "lucide-react/icons/mail";
import Maximize from "lucide-react/icons/maximize";
import Network from "lucide-react/icons/network";
import PanelLeft from "lucide-react/icons/panel-left";
import PanelLeftClose from "lucide-react/icons/panel-left-close";
import PencilIcon from "lucide-react/icons/pencil";
import Play from "lucide-react/icons/play";
import Plus from "lucide-react/icons/plus";
import Scissors from "lucide-react/icons/scissors";
import Square from "lucide-react/icons/square";
import Trash2 from "lucide-react/icons/trash-2";
import X from "lucide-react/icons/x";
import React, { useEffect } from "react";

import { ActionBarButton, ActionBarGroup } from "@/components/ui/action-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
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

const actionBarButtonOutlineClassName =
  "bg-neutral-200 hover:bg-neutral-300 text-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-300";

interface StatusBarProps {
  workflowStatus: WorkflowExecutionStatus;
  nodeCount: number;
  readonly?: boolean;
}

function StatusBar({ workflowStatus, nodeCount, readonly }: StatusBarProps) {
  const statusConfig = {
    idle: {
      color: "text-neutral-600 dark:text-neutral-400",
      bg: "bg-neutral-200 dark:bg-neutral-700",
      label: "Ready",
    },
    submitted: {
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-200 dark:bg-orange-900/50",
      label: "Queued",
    },
    executing: {
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-400 dark:bg-yellow-500",
      label: "Running",
    },
    completed: {
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-200 dark:bg-green-900/50",
      label: "Completed",
    },
    error: {
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-200 dark:bg-red-900/50",
      label: "Error",
    },
    cancelled: {
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-200 dark:bg-gray-700",
      label: "Cancelled",
    },
    paused: {
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-200 dark:bg-blue-900/50",
      label: "Paused",
    },
  };

  const config = statusConfig[workflowStatus] || statusConfig.idle;

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-3 z-50">
      <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 shadow-sm flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", config.bg)}>
            <div className={cn("w-full h-full rounded-full")} />
          </div>
          <span className={cn("text-sm font-medium", config.color)}>
            {config.label}
          </span>
        </div>

        <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600" />

        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <span>
            {nodeCount} node{nodeCount !== 1 ? "s" : ""}
          </span>
          {readonly && (
            <>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400">
                Read-only
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export interface WorkflowCanvasProps {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  connectionValidationState?: ConnectionValidationState;
  workflowType?: WorkflowType;
  onNodesChange: OnNodesChange<ReactFlowNode<WorkflowNodeType>>;
  onEdgesChange: OnEdgesChange<ReactFlowEdge<WorkflowEdgeType>>;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onNodeDragStop: (
    event: React.MouseEvent,
    node: ReactFlowNode<WorkflowNodeType>
  ) => void;
  onNodeDoubleClick?: (event: React.MouseEvent) => void;
  onInit: (
    instance: ReactFlowInstance<
      ReactFlowNode<WorkflowNodeType>,
      ReactFlowEdge<WorkflowEdgeType>
    >
  ) => void;
  onAddNode?: () => void;
  onAction?: (e: React.MouseEvent) => void;
  onDeploy?: (e: React.MouseEvent) => void;
  onEditMetadata?: (e: React.MouseEvent) => void;
  onSetSchedule?: () => void;
  onShowHttpIntegration?: () => void;
  onShowEmailTrigger?: () => void;
  workflowStatus?: WorkflowExecutionStatus;
  onToggleSidebar?: (e: React.MouseEvent) => void;
  isSidebarVisible?: boolean;
  showControls?: boolean;
  isValidConnection?: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;
  readonly?: boolean;
  expandedOutputs?: boolean;
  onToggleExpandedOutputs?: (e: React.MouseEvent) => void;
  onFitToScreen?: (e: React.MouseEvent) => void;
  selectedNodes: ReactFlowNode<WorkflowNodeType>[];
  selectedEdges: ReactFlowEdge<WorkflowEdgeType>[];
  onDeleteSelected?: (e: React.MouseEvent) => void;
  onDuplicateSelected?: (e: React.MouseEvent) => void;
  onEditLabel?: (e: React.MouseEvent) => void;
  onApplyLayout?: () => void;
  onCopySelected?: () => void;
  onCutSelected?: () => void;
  onPasteFromClipboard?: () => void;
  hasClipboardData?: boolean;
}

type ActionButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  workflowStatus?: WorkflowExecutionStatus;
  disabled?: boolean;
  className?: string;
  text?: string;
  showTooltip?: boolean;
};

export function ActionButton({
  onClick,
  workflowStatus = "idle",
  disabled,
  className = "",
  text = "",
  showTooltip = true,
}: ActionButtonProps) {
  const statusConfig = {
    idle: {
      icon: <Play className="!size-4" />,
      title: "Execute Workflow",
      shortcut: "⌘⏎",
      className: "bg-green-600 hover:bg-green-700 text-white",
    },
    submitted: {
      icon: <Square className="!size-4" />,
      title: "Stop Execution",
      shortcut: "⌘⏎",
      className: "bg-red-600 hover:bg-red-700 text-white",
    },
    executing: {
      icon: <Square className="!size-4" />,
      title: "Stop Execution",
      shortcut: "⌘⏎",
      className: "bg-red-600 hover:bg-red-700 text-white",
    },
    completed: {
      icon: <X className="!size-4" />,
      title: "Clear Outputs & Reset",
      shortcut: "⌘⏎",
      className: "bg-amber-500 hover:bg-amber-600 text-white",
    },
    error: {
      icon: <X className="!size-4" />,
      title: "Clear Errors & Reset",
      shortcut: "⌘⏎",
      className: "bg-amber-500 hover:bg-amber-600 text-white",
    },
    cancelled: {
      icon: <Play className="!size-4" />,
      title: "Restart Workflow",
      shortcut: "⌘⏎",
      className: "bg-green-600 hover:bg-green-700 text-white",
    },
    paused: {
      icon: <Play className="!size-4" />,
      title: "Resume Workflow",
      shortcut: "⌘⏎",
      className: "bg-sky-600 hover:bg-sky-700 text-white",
    },
  };

  // Use a default config if the status isn't in our mapping
  const config = statusConfig[workflowStatus] || statusConfig.idle;

  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={cn(config.className, className)}
      tooltipSide="bottom"
      tooltip={
        showTooltip && (
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
        )
      }
    >
      {config.icon}
      {text}
    </ActionBarButton>
  );
}

export function DeployButton({
  onClick,
  disabled,
  text = "",
  className = "",
  tooltip = "Deploy Workflow",
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  text?: string;
  className?: string;
  tooltip?: string;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={cn("bg-blue-600 hover:bg-blue-700 text-white", className)}
      tooltipSide="bottom"
      tooltip={tooltip}
    >
      <ArrowUpToLine className="!size-4" />
      {text}
    </ActionBarButton>
  );
}

export function EditMetadataButton({
  onClick,
  className = "",
  tooltip = "Edit Metadata",
}: {
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  tooltip?: string;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      tooltip={tooltip}
      tooltipSide="bottom"
      className={cn(actionBarButtonOutlineClassName, className)}
    >
      <FileText className="!size-4" />
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
      tooltipSide="bottom"
      tooltip={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
      className={actionBarButtonOutlineClassName}
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
    ? "No outputs or errors to show"
    : expandedOutputs
      ? "Hide All Outputs & Errors"
      : "Show All Outputs & Errors";

  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={actionBarButtonOutlineClassName}
      tooltipSide="bottom"
      tooltip={tooltipText}
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
      className={actionBarButtonOutlineClassName}
      tooltipSide="right"
      tooltip="Fit to Screen"
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
      className={cn(
        actionBarButtonOutlineClassName,
        "text-red-600 dark:text-red-500"
      )}
      tooltipSide="right"
      tooltip={
        <div className="flex items-center gap-2">
          <span>Delete</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              ⌫
            </kbd>
          </div>
        </div>
      }
    >
      <Trash2 className="!size-4" />
    </ActionBarButton>
  );
}

function DuplicateButton({
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
      className={actionBarButtonOutlineClassName}
      tooltipSide="right"
      tooltip={
        <div className="flex items-center gap-2">
          <span>Duplicate</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              ⌘
            </kbd>
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              D
            </kbd>
          </div>
        </div>
      }
    >
      <Layers2 className="!size-4" />
    </ActionBarButton>
  );
}

function EditLabelButton({
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
      className={actionBarButtonOutlineClassName}
      tooltipSide="right"
      tooltip="Edit Label(s)"
    >
      <PencilIcon className="!size-4" />
    </ActionBarButton>
  );
}

function ApplyLayoutButton({
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
      className={actionBarButtonOutlineClassName}
      tooltipSide="right"
      tooltip={<p>Reorganize Layout</p>}
    >
      <Network className="!size-4" />
    </ActionBarButton>
  );
}

function AddNodeButton({
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
      tooltip="Add Node"
      className="size-10 !p-0 bg-blue-600 hover:bg-blue-700 text-white"
      tooltipSide="right"
    >
      <Plus className="!size-5" />
    </ActionBarButton>
  );
}

export function SetScheduleButton({
  onClick,
  disabled,
  className = "",
  text = "",
  tooltip = "Set Schedule",
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  text?: string;
  tooltip?: string;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={cn("bg-purple-600 hover:bg-purple-700 text-white", className)}
      tooltipSide="bottom"
      tooltip={tooltip}
    >
      <Clock className="!size-4" />
      {text}
    </ActionBarButton>
  );
}

export function ShowHttpIntegrationButton({
  onClick,
  disabled,
  className,
  text = "",
  tooltip = "Show HTTP Integration",
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  text?: string;
  tooltip?: string;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={cn("bg-purple-600 hover:bg-purple-700 text-white", className)}
      tooltipSide="bottom"
      tooltip={tooltip}
    >
      <Globe className="!size-4" />
      {text}
    </ActionBarButton>
  );
}

export function ShowEmailTriggerButton({
  onClick,
  disabled,
  className = "",
  text = "",
  tooltip = "Show Email Trigger",
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  text?: string;
  tooltip?: string;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={cn("bg-purple-600 hover:bg-purple-700 text-white", className)}
      tooltipSide="bottom"
      tooltip={tooltip}
    >
      <Mail className="!size-4" />
      {text}
    </ActionBarButton>
  );
}

function CopyButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={actionBarButtonOutlineClassName}
      tooltipSide="right"
      tooltip={
        <div className="flex items-center gap-2">
          <span>Copy</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              ⌘
            </kbd>
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              C
            </kbd>
          </div>
        </div>
      }
    >
      <Copy className="!size-4" />
    </ActionBarButton>
  );
}

function CutButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={cn(
        actionBarButtonOutlineClassName,
        "text-orange-600 dark:text-orange-500"
      )}
      tooltipSide="right"
      tooltip={
        <div className="flex items-center gap-2">
          <span>Cut</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              ⌘
            </kbd>
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              X
            </kbd>
          </div>
        </div>
      }
    >
      <Scissors className="!size-4" />
    </ActionBarButton>
  );
}

function PasteButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={cn(
        actionBarButtonOutlineClassName,
        "text-green-600 dark:text-green-500"
      )}
      tooltipSide="right"
      tooltip={
        <div className="flex items-center gap-2">
          <span>Paste</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              ⌘
            </kbd>
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              V
            </kbd>
          </div>
        </div>
      }
    >
      <ClipboardPaste className="!size-4" />
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
  onNodeDoubleClick,
  onNodeDragStop,
  onInit,
  onAddNode,
  onAction,
  onDeploy,
  onEditMetadata,
  workflowType,
  onSetSchedule,
  onShowHttpIntegration,
  onShowEmailTrigger,
  workflowStatus = "idle",
  onToggleSidebar,
  isSidebarVisible,
  showControls = true,
  isValidConnection,
  readonly = false,
  expandedOutputs = false,
  onToggleExpandedOutputs,
  onFitToScreen,
  selectedNodes,
  selectedEdges,
  onDeleteSelected,
  onDuplicateSelected,
  onEditLabel,
  onApplyLayout,
  onCopySelected,
  onCutSelected,
  onPasteFromClipboard,
  hasClipboardData = false,
}: WorkflowCanvasProps) {
  // Check if any nodes have output values
  const hasAnyOutputs = nodes.some((node) =>
    node.data.outputs.some((output) => output.value !== undefined)
  );

  // Get selected elements for button states
  const hasSelectedElements =
    selectedNodes.length > 0 || selectedEdges.length > 0;
  const hasSelectedNodes = selectedNodes.length > 0;

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
        onNodesChange={onNodesChange}
        onEdgesChange={readonly ? () => {} : onEdgesChange}
        onConnect={readonly ? () => {} : onConnect}
        onConnectStart={readonly ? () => {} : onConnectStart}
        onConnectEnd={readonly ? () => {} : onConnectEnd}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
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
        multiSelectionKeyCode="Shift"
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
            onSetSchedule ||
            onToggleExpandedOutputs ||
            (onToggleSidebar && isSidebarVisible !== undefined))) ||
          (readonly &&
            (onToggleExpandedOutputs ||
              (onToggleSidebar && isSidebarVisible !== undefined)))) && (
          <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
            {/* Run/Deploy/Schedule Group - only shown when not readonly */}
            {!readonly &&
              (onAction ||
                onDeploy ||
                (onSetSchedule && workflowType === "cron")) && (
                <ActionBarGroup>
                  {onAction && (
                    <ActionButton
                      onClick={onAction}
                      workflowStatus={workflowStatus}
                      disabled={
                        (workflowStatus === "idle" ||
                          workflowStatus === "submitted" ||
                          workflowStatus === "executing") &&
                        nodes.length === 0
                      }
                    />
                  )}
                  {onDeploy && (
                    <DeployButton
                      onClick={onDeploy}
                      disabled={nodes.length === 0}
                    />
                  )}
                  {onSetSchedule && workflowType === "cron" && (
                    <SetScheduleButton
                      onClick={onSetSchedule}
                      disabled={nodes.length === 0}
                    />
                  )}
                  {onShowHttpIntegration && workflowType === "http_request" && (
                    <ShowHttpIntegrationButton
                      onClick={onShowHttpIntegration}
                    />
                  )}
                  {onShowEmailTrigger && workflowType === "email_message" && (
                    <ShowEmailTriggerButton onClick={onShowEmailTrigger} />
                  )}
                </ActionBarGroup>
              )}

            {/* Preview/Sidebar Group - shown in both readonly and editable modes */}
            {(onToggleExpandedOutputs ||
              (onToggleSidebar && isSidebarVisible !== undefined)) && (
              <ActionBarGroup>
                {onEditMetadata && (
                  <EditMetadataButton onClick={onEditMetadata} />
                )}

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

        {!readonly && (
          <div
            className={cn(
              "absolute top-4 left-4 z-50 flex flex-col items-center gap-2"
            )}
          >
            {/* Node-related buttons group */}
            <ActionBarGroup vertical>
              {onAddNode && (
                <AddNodeButton onClick={onAddNode} disabled={readonly} />
              )}
              {onEditLabel && (
                <EditLabelButton
                  onClick={onEditLabel}
                  disabled={
                    readonly || (!hasSelectedNodes && !selectedNodes.length)
                  }
                />
              )}
            </ActionBarGroup>

            {/* Edit operations group */}
            <ActionBarGroup vertical>
              {onCopySelected && (
                <CopyButton
                  onClick={onCopySelected}
                  disabled={readonly || !hasSelectedNodes}
                />
              )}
              {onCutSelected && (
                <CutButton
                  onClick={onCutSelected}
                  disabled={readonly || !hasSelectedNodes}
                />
              )}
              {onPasteFromClipboard && (
                <PasteButton
                  onClick={onPasteFromClipboard}
                  disabled={readonly || !hasClipboardData}
                />
              )}
              {onDuplicateSelected && (
                <DuplicateButton
                  onClick={onDuplicateSelected}
                  disabled={
                    readonly || (!hasSelectedNodes && !selectedNodes.length)
                  }
                />
              )}
              {onDeleteSelected && (
                <DeleteButton
                  onClick={onDeleteSelected}
                  disabled={
                    readonly ||
                    (!hasSelectedElements &&
                      !selectedNodes.length &&
                      !selectedEdges.length)
                  }
                />
              )}
            </ActionBarGroup>

            {/* Workflow-related buttons group */}
            {(onApplyLayout || onFitToScreen) && (
              <ActionBarGroup vertical>
                {onApplyLayout && (
                  <ApplyLayoutButton
                    onClick={() => onApplyLayout()}
                    disabled={readonly || nodes.length === 0}
                  />
                )}
                {onFitToScreen && <FitToScreenButton onClick={onFitToScreen} />}
              </ActionBarGroup>
            )}
          </div>
        )}
      </ReactFlow>
    </TooltipProvider>
  );
}
