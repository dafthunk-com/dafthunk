import "@xyflow/react/dist/style.css";

import type {
  IsValidConnection,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  OnEdgesChange,
  OnNodeDrag,
  OnNodesChange,
  Edge as ReactFlowEdge,
  ReactFlowInstance,
  Node as ReactFlowNode,
} from "@xyflow/react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ReactFlow,
} from "@xyflow/react";
import { PanelRightClose, PanelRightOpen, Plus } from "lucide-react";
import ClipboardPaste from "lucide-react/icons/clipboard-paste";
import Clock from "lucide-react/icons/clock";
import Copy from "lucide-react/icons/copy";
import Layers2 from "lucide-react/icons/layers-2";
import MapIcon from "lucide-react/icons/map";
import Maximize from "lucide-react/icons/maximize";
import Network from "lucide-react/icons/network";
import Play from "lucide-react/icons/play";
import Scissors from "lucide-react/icons/scissors";
import Square from "lucide-react/icons/square";
import Trash2 from "lucide-react/icons/trash-2";
import WorkflowIcon from "lucide-react/icons/workflow";
import X from "lucide-react/icons/x";
import React, { useMemo } from "react";

import {
  ActionBarButton,
  ActionBarGroup,
  actionBarButtonOutlineClassName,
} from "@/components/ui/action-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn, getModifierKey, getModifierSymbol } from "@/utils/utils";

import { WorkflowConnectionLine, WorkflowEdge } from "./workflow-edge";
import { WorkflowNode } from "./workflow-node";
import { WorkflowOverviewNode } from "./workflow-overview-node";
import type {
  ConnectionValidationState,
  WorkflowEdgeType,
  WorkflowExecutionStatus,
  WorkflowNodeType,
} from "./workflow-types";

const nodeTypes = {
  workflowNode: WorkflowNode,
  workflowOverviewNode: WorkflowOverviewNode,
};

const edgeTypes = {
  workflowEdge: WorkflowEdge,
};

interface StatusBarProps {
  workflowStatus: WorkflowExecutionStatus;
  errorMessage?: string;
}

function StatusBar({ workflowStatus, errorMessage }: StatusBarProps) {
  const statusConfig = {
    idle: {
      color: "text-neutral-600 dark:text-neutral-400",
      bg: "bg-neutral-200 dark:bg-neutral-700",
      label: "Idle",
    },
    submitted: {
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-200 dark:bg-orange-900/50",
      label: "Submitted",
    },
    executing: {
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-400 dark:bg-yellow-500",
      label: "Executing",
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
      color: "text-neutral-600 dark:text-neutral-400",
      bg: "bg-neutral-200 dark:bg-neutral-700",
      label: "Cancelled",
    },
    paused: {
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-200 dark:bg-blue-900/50",
      label: "Paused",
    },
    exhausted: {
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-200 dark:bg-red-900/50",
      label: "Exhausted",
    },
  };

  const config = statusConfig[workflowStatus] || statusConfig.idle;

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-3 z-50">
      <div className="bg-white dark:bg-neutral-900 backdrop-blur-xs border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 shadow-xs flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", config.bg)}>
            <div className={cn("w-full h-full rounded-full")} />
          </div>
          <span className={cn("text-sm font-medium", config.color)}>
            {config.label}
          </span>
        </div>

        {workflowStatus === "error" && errorMessage ? (
          <>
            <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600" />
            <span className="text-sm text-red-600 dark:text-red-400 max-w-md truncate">
              {errorMessage}
            </span>
          </>
        ) : null}
      </div>
    </div>
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
  onNodeDragStart?: () => void;
  onNodeDragStop: OnNodeDrag<ReactFlowNode<WorkflowNodeType>>;
  onNodeDoubleClick?: (event: React.MouseEvent) => void;
  onInit: (
    instance: ReactFlowInstance<
      ReactFlowNode<WorkflowNodeType>,
      ReactFlowEdge<WorkflowEdgeType>
    >
  ) => void;
  onAddNode?: () => void;
  /** Run / cancel / reset. Also invoked by the Cmd+Enter shortcut. */
  onAction?: () => void;
  workflowStatus?: WorkflowExecutionStatus;
  workflowErrorMessage?: string;
  onToggleSidebar?: (e: React.MouseEvent) => void;
  isSidebarVisible?: boolean;
  showControls?: boolean;
  /** Extra control rendered beside Run, e.g. the example picker. */
  runSlot?: React.ReactNode;
  isValidConnection?: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;
  disabled?: boolean;
  onFitToScreen?: (e: React.MouseEvent) => void;
  selectedNodes: ReactFlowNode<WorkflowNodeType>[];
  selectedEdges: ReactFlowEdge<WorkflowEdgeType>[];
  onDeleteSelected?: (e: React.MouseEvent) => void;
  onDuplicateSelected?: (e: React.MouseEvent) => void;
  onApplyLayout?: () => void;
  onCopySelected?: () => void;
  onCutSelected?: () => void;
  onPasteFromClipboard?: () => void;
  hasClipboardData?: boolean;
  showBackground?: boolean;
  /** Padding for React Flow's `fitView`. Defaults to 0.25. */
  fitViewPadding?: number;
  /**
   * Render every node as a schematic pill instead of the detailed card.
   * A viewing mode, not an editing one: dragging, connecting, and deleting
   * are off while it is active, whatever the builder mode says.
   */
  overview?: boolean;
  onToggleOverview?: () => void;
}

interface ActionButtonProps {
  onClick: () => void;
  workflowStatus?: WorkflowExecutionStatus;
  disabled?: boolean;
  className?: string;
  text?: string;
  showTooltip?: boolean;
}

export function ActionButton({
  onClick,
  workflowStatus = "idle",
  disabled,
  className = "",
  text = "",
  showTooltip = true,
}: ActionButtonProps) {
  const modifierSymbol = getModifierSymbol();
  const shortcut = `${modifierSymbol}⏎`;

  const statusConfig = {
    idle: {
      icon: <Play className="size-4!" />,
      title: "Execute Workflow",
      className:
        "bg-white hover:bg-neutral-50 text-green-500 hover:text-green-600 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-green-400 dark:hover:text-green-300",
    },
    submitted: {
      icon: <Square className="size-4!" />,
      title: "Stop Execution",
      className:
        "bg-white hover:bg-neutral-50 text-red-500 hover:text-red-600 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-red-400 dark:hover:text-red-300",
    },
    executing: {
      icon: <Square className="size-4!" />,
      title: "Stop Execution",
      className:
        "bg-white hover:bg-neutral-50 text-red-500 hover:text-red-600 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-red-400 dark:hover:text-red-300",
    },
    completed: {
      icon: <X className="size-4!" />,
      title: "Clear Outputs & Reset",
      className:
        "bg-white hover:bg-neutral-50 text-amber-500 hover:text-amber-600 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-amber-400 dark:hover:text-amber-300",
    },
    error: {
      icon: <X className="size-4!" />,
      title: "Clear Errors & Reset",
      className:
        "bg-white hover:bg-neutral-50 text-amber-500 hover:text-amber-600 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-amber-400 dark:hover:text-amber-300",
    },
    cancelled: {
      icon: <X className="size-4!" />,
      title: "Clear Outputs & Reset",
      className:
        "bg-white hover:bg-neutral-50 text-amber-500 hover:text-amber-600 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-amber-400 dark:hover:text-amber-300",
    },
    paused: {
      icon: <Play className="size-4!" />,
      title: "Resume Workflow",
      className:
        "bg-white hover:bg-neutral-50 text-sky-500 hover:text-sky-600 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-sky-400 dark:hover:text-sky-300",
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
              {shortcut.split("").map((key, index) => (
                <kbd
                  key={index}
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

interface SidebarToggleProps {
  onClick: (e: React.MouseEvent) => void;
  isSidebarVisible: boolean;
}

function SidebarToggle({ onClick, isSidebarVisible }: SidebarToggleProps) {
  return (
    <ActionBarButton
      onClick={onClick}
      tooltipSide="bottom"
      tooltip={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
      className={actionBarButtonOutlineClassName}
    >
      {isSidebarVisible ? (
        <PanelRightClose className="size-4!" />
      ) : (
        <PanelRightOpen className="size-4!" />
      )}
    </ActionBarButton>
  );
}

/** Exported for the generator's embedded schematic view, like the toggle. */
export function FitToScreenButton({
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
      <Maximize className="size-4!" />
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
      className={actionBarButtonOutlineClassName}
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
      <Trash2 className="size-4!" />
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
  const modifierKey = getModifierKey();
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
              {modifierKey}
            </kbd>
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              D
            </kbd>
          </div>
        </div>
      }
    >
      <Layers2 className="size-4!" />
    </ActionBarButton>
  );
}

/**
 * Exported for the generator's embedded schematic view, so the same two
 * icons mean the same two views everywhere a workflow is drawn.
 */
export function OverviewToggleButton({
  overview,
  onClick,
}: {
  overview: boolean;
  onClick: () => void;
}) {
  return (
    <ActionBarButton
      onClick={() => onClick()}
      className={actionBarButtonOutlineClassName}
      tooltipSide="right"
      tooltip={overview ? "Show the Wiring" : "Overview"}
    >
      {overview ? (
        <WorkflowIcon className="size-4!" />
      ) : (
        <MapIcon className="size-4!" />
      )}
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
      <Network className="size-4!" />
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
      className={cn(
        actionBarButtonOutlineClassName,
        "size-10 p-0! text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
      )}
      tooltipSide="right"
    >
      <Plus className="size-5!" />
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
      className={cn(actionBarButtonOutlineClassName, className)}
      tooltipSide="bottom"
      tooltip={tooltip}
    >
      <Clock className="size-4!" />
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
  const modifierKey = getModifierKey();
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
              {modifierKey}
            </kbd>
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              C
            </kbd>
          </div>
        </div>
      }
    >
      <Copy className="size-4!" />
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
  const modifierKey = getModifierKey();
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={actionBarButtonOutlineClassName}
      tooltipSide="right"
      tooltip={
        <div className="flex items-center gap-2">
          <span>Cut</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              {modifierKey}
            </kbd>
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              X
            </kbd>
          </div>
        </div>
      }
    >
      <Scissors className="size-4!" />
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
  const modifierKey = getModifierKey();
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={actionBarButtonOutlineClassName}
      tooltipSide="right"
      tooltip={
        <div className="flex items-center gap-2">
          <span>Paste</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              {modifierKey}
            </kbd>
            <kbd className="px-1 py-0.25 text-xs rounded border font-mono">
              V
            </kbd>
          </div>
        </div>
      }
    >
      <ClipboardPaste className="size-4!" />
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
  onNodeDragStart,
  onNodeDragStop,
  onInit,
  onAddNode,
  onAction,
  workflowStatus = "idle",
  workflowErrorMessage,
  onToggleSidebar,
  isSidebarVisible,
  showControls = true,
  runSlot,
  isValidConnection,
  disabled = false,
  onFitToScreen,
  selectedNodes,
  selectedEdges,
  onDeleteSelected,
  onDuplicateSelected,
  onApplyLayout,
  onCopySelected,
  onCutSelected,
  onPasteFromClipboard,
  hasClipboardData = false,
  showBackground = true,
  fitViewPadding = 0.25,
  overview = false,
  onToggleOverview,
}: WorkflowCanvasProps) {
  // Get selected elements for button states
  const hasSelectedElements =
    selectedNodes.length > 0 || selectedEdges.length > 0;
  const hasSelectedNodes = selectedNodes.length > 0;

  // The overview is the same graph through a different renderer: swap the
  // node type at render time so the stored nodes (positions, data, selection)
  // stay untouched and toggling back is free.
  const displayNodes = useMemo(
    () =>
      overview
        ? nodes.map((node) => ({
            ...node,
            type: "workflowOverviewNode",
          }))
        : nodes,
    [nodes, overview]
  );

  const editable = !disabled && !overview;

  return (
    <TooltipProvider>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStart={onNodeDragStart}
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
          padding: fitViewPadding,
          maxZoom: 2,
        }}
        minZoom={0.05}
        maxZoom={4}
        className={cn(
          showBackground && "bg-neutral-100/50",
          disabled && "cursor-default"
        )}
        nodesDraggable={editable && showControls}
        nodesConnectable={editable && showControls}
        elementsSelectable={showControls}
        selectNodesOnDrag={editable && showControls}
        // In overview the graph is not editable, but the state hooks behind
        // onNodesChange still are — so Backspace must be cut off here.
        deleteKeyCode={editable ? undefined : null}
        multiSelectionKeyCode={showControls ? "Shift" : undefined}
        panOnDrag={showControls}
        zoomOnScroll={showControls}
        zoomOnPinch={showControls}
        zoomOnDoubleClick={showControls}
        preventScrolling={showControls}
      >
        {showControls && (
          <Controls
            showInteractive={false}
            showZoom={false}
            showFitView={false}
          />
        )}
        {showBackground && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={12}
            size={1}
            className="stroke-foreground/5 opacity-50"
          />
        )}

        {/* Status Bar - hidden in read-only mode */}
        {!disabled && (
          <StatusBar
            workflowStatus={workflowStatus}
            errorMessage={workflowErrorMessage}
          />
        )}

        {/* Action Bars */}
        {showControls &&
          (onAction || (onToggleSidebar && isSidebarVisible !== undefined)) && (
            <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
              {/* Caller-supplied slot (e.g. the example picker). Opaque on
                  purpose: the canvas should not know what it holds. */}
              {runSlot && <ActionBarGroup>{runSlot}</ActionBarGroup>}

              {/* Runtime Actions Group - Execute */}
              {onAction && (
                <ActionBarGroup>
                  <ActionButton
                    onClick={() => onAction()}
                    workflowStatus={workflowStatus}
                    disabled={
                      disabled ||
                      ((workflowStatus === "idle" ||
                        workflowStatus === "submitted" ||
                        workflowStatus === "executing") &&
                        nodes.length === 0)
                    }
                  />
                </ActionBarGroup>
              )}

              {/* View Controls Group - Sidebar */}
              {onToggleSidebar && isSidebarVisible !== undefined && (
                <ActionBarGroup>
                  <SidebarToggle
                    onClick={onToggleSidebar}
                    isSidebarVisible={isSidebarVisible}
                  />
                </ActionBarGroup>
              )}
            </div>
          )}

        {showControls && (
          <div
            className={cn(
              "absolute top-4 left-4 z-50 flex flex-col items-center gap-2"
            )}
          >
            {/* Node-related buttons group */}
            <ActionBarGroup vertical>
              {onAddNode && (
                <AddNodeButton onClick={onAddNode} disabled={disabled} />
              )}
            </ActionBarGroup>

            {/* Edit operations group */}
            <ActionBarGroup vertical>
              {onCopySelected && (
                <CopyButton
                  onClick={onCopySelected}
                  disabled={disabled || !hasSelectedNodes}
                />
              )}
              {onCutSelected && (
                <CutButton
                  onClick={onCutSelected}
                  disabled={disabled || !hasSelectedNodes}
                />
              )}
              {onPasteFromClipboard && (
                <PasteButton
                  onClick={onPasteFromClipboard}
                  disabled={disabled || !hasClipboardData}
                />
              )}
              {onDuplicateSelected && (
                <DuplicateButton
                  onClick={onDuplicateSelected}
                  disabled={disabled || !hasSelectedNodes}
                />
              )}
              {onDeleteSelected && (
                <DeleteButton
                  onClick={onDeleteSelected}
                  disabled={disabled || !hasSelectedElements}
                />
              )}
            </ActionBarGroup>

            {/* Workflow-related buttons group. The layout and fit buttons are
                hidden in read-only mode; the overview toggle stays — it is a
                way of looking, not a way of editing. */}
            {((!disabled && (onApplyLayout || onFitToScreen)) ||
              onToggleOverview) && (
              <ActionBarGroup vertical>
                {!disabled && onApplyLayout && (
                  <ApplyLayoutButton
                    onClick={() => onApplyLayout()}
                    disabled={disabled || nodes.length === 0}
                  />
                )}
                {!disabled && onFitToScreen && (
                  <FitToScreenButton onClick={onFitToScreen} />
                )}
                {onToggleOverview && (
                  <OverviewToggleButton
                    overview={overview}
                    onClick={onToggleOverview}
                  />
                )}
              </ActionBarGroup>
            )}
          </div>
        )}
      </ReactFlow>
    </TooltipProvider>
  );
}
