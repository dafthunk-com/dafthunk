import type {
  ObjectReference,
  WorkflowRuntime,
  WorkflowTrigger,
} from "@dafthunk/types";
import type {
  Connection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/utils";

import { ExecutionEmailDialog } from "./execution-email-dialog";
import { HttpRequestConfigDialog } from "./http-request-config-dialog";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { useResizableSidebar } from "./use-resizable-sidebar";
import { useWorkflowExecutionState } from "./use-workflow-execution-state";
import { useWorkflowState } from "./use-workflow-state";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowProvider } from "./workflow-context";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { WorkflowSidebar } from "./workflow-sidebar";
import type {
  NodeType,
  WorkflowEdgeType,
  WorkflowExecution,
  WorkflowNodeType,
} from "./workflow-types";

/**
 * Controls the builder's interaction level:
 * - "edit"     — Full editing: drag, connect, add/remove nodes, sidebar, controls
 * - "readonly" — Can zoom/pan/inspect, but cannot modify the workflow
 * - "preview"  — Completely static: no interaction, no sidebar, no controls
 */
type WorkflowBuilderMode = "edit" | "readonly" | "preview";

export interface WorkflowBuilderProps {
  workflowId: string;
  workflowTrigger?: WorkflowTrigger;
  workflowRuntime?: WorkflowRuntime;
  initialNodes?: ReactFlowNode<WorkflowNodeType>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeType>[];
  nodeTypes?: NodeType[];
  onNodesChange?: (nodes: ReactFlowNode<WorkflowNodeType>[]) => void;
  onEdgesChange?: (edges: ReactFlowEdge<WorkflowEdgeType>[]) => void;
  validateConnection?: (connection: Connection) => boolean;
  executeWorkflow?: (
    workflowId: string,
    onExecution: (execution: WorkflowExecution) => void,
    triggerData?: unknown
  ) => void | (() => void | Promise<void>);
  initialWorkflowExecution?: WorkflowExecution;
  mode?: WorkflowBuilderMode;
  disabledFeedback?: boolean;
  createObjectUrl: (objectReference: ObjectReference) => string;
  expandedOutputs?: boolean;
  workflowName?: string;
  workflowDescription?: string;
  onWorkflowUpdate?: (
    name: string,
    description?: string,
    trigger?: WorkflowTrigger,
    runtime?: WorkflowRuntime
  ) => void;
  orgId: string;
  wsExecuteWorkflow?: (options?: {
    parameters?: Record<string, unknown>;
  }) => void;
  showSidebar?: boolean;
  isEnabled?: boolean;
  isTogglingEnabled?: boolean;
  onToggleEnabled?: (checked: boolean) => void;
}

export function WorkflowBuilder({
  workflowId,
  workflowTrigger,
  workflowRuntime,
  initialNodes = [],
  initialEdges = [],
  nodeTypes = [],
  onNodesChange: onNodesChangeFromParent,
  onEdgesChange: onEdgesChangeFromParent,
  validateConnection,
  executeWorkflow,
  initialWorkflowExecution,
  mode = "edit",
  disabledFeedback = false,
  createObjectUrl,
  expandedOutputs = false,
  workflowName,
  workflowDescription,
  onWorkflowUpdate,
  orgId,
  wsExecuteWorkflow,
  showSidebar,
  isEnabled,
  isTogglingEnabled,
  onToggleEnabled,
}: WorkflowBuilderProps) {
  const readOnly = mode !== "edit";
  const interactive = mode !== "preview";
  const sidebarEnabled = showSidebar ?? interactive;

  // Graph state & operations
  const {
    nodes,
    edges,
    selectedNodes,
    selectedEdges,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    handleAddNode,
    handleNodeSelect,
    updateNodeExecution,
    setReactFlowInstance,
    reactFlowInstance,
    connectionValidationState,
    isValidConnection,
    updateNodeData,
    updateEdgeData,
    deleteEdge,
    deleteSelected,
    deselectAll,
    duplicateSelected,
    applyLayout,
    copySelected,
    cutSelected,
    pasteFromClipboard,
    hasClipboardData,
    onNodeDragStop,
    addTriggerNodes,
    removeTriggerNodes,
  } = useWorkflowState({
    initialNodes,
    initialEdges,
    onNodesChangePersist: onNodesChangeFromParent,
    onEdgesChangePersist: onEdgesChangeFromParent,
    validateConnection,
    createObjectUrl,
    disabled: readOnly,
    nodeTypes,
  });

  // Execution state
  const execution = useWorkflowExecutionState({
    workflowId,
    workflowTrigger,
    orgId,
    nodes,
    nodeTypes,
    initialWorkflowExecution,
    executeWorkflow,
    wsExecuteWorkflow,
    updateNodeExecution,
    updateNodeData,
    deselectAll,
  });

  // Sidebar
  const sidebar = useResizableSidebar({ initialVisible: sidebarEnabled });

  // Keyboard shortcuts (Cmd+C/X/V/D + Cmd+Enter)
  const handleActionButtonClick =
    !readOnly && executeWorkflow
      ? execution.handleActionButtonClick
      : undefined;

  useKeyboardShortcuts({
    disabled: readOnly,
    selectedNodes,
    selectedEdges,
    hasClipboardData,
    copySelected,
    cutSelected,
    pasteFromClipboard,
    duplicateSelected,
    onAction: handleActionButtonClick,
    nodeCount: nodes.length,
  });

  const handleFitToScreen = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.25, duration: 200, maxZoom: 2 });
  }, [reactFlowInstance]);

  const handleNodeDoubleClick = useCallback(() => {
    sidebar.setIsSidebarVisible(true);
  }, [sidebar]);

  // Check if workflow already contains a trigger node
  const hasTriggerNode = useMemo(() => {
    if (!nodeTypes) return false;
    const triggerTypes = new Set(
      nodeTypes.filter((t) => t.trigger).map((t) => t.type)
    );
    return nodes.some(
      (n) => n.data.nodeType && triggerTypes.has(n.data.nodeType)
    );
  }, [nodes, nodeTypes]);

  // Trigger change: confirmation dialog + node swap
  const [triggerConfirmOpen, setTriggerConfirmOpen] = useState(false);
  const pendingTriggerRef = useRef<WorkflowTrigger | null>(null);

  const applyTriggerChange = useCallback(
    (newTrigger: WorkflowTrigger) => {
      removeTriggerNodes();
      addTriggerNodes(newTrigger);
      onWorkflowUpdate?.(
        workflowName || "",
        workflowDescription || undefined,
        newTrigger,
        workflowRuntime
      );
    },
    [
      removeTriggerNodes,
      addTriggerNodes,
      onWorkflowUpdate,
      workflowName,
      workflowDescription,
      workflowRuntime,
    ]
  );

  const handleTriggerChange = useCallback((newTrigger: WorkflowTrigger) => {
    pendingTriggerRef.current = newTrigger;
    setTriggerConfirmOpen(true);
  }, []);

  return (
    <ReactFlowProvider>
      <WorkflowProvider
        updateNodeData={readOnly ? undefined : updateNodeData}
        updateEdgeData={readOnly ? undefined : updateEdgeData}
        deleteEdge={readOnly ? undefined : deleteEdge}
        edges={edges}
        disabled={readOnly}
        expandedOutputs={expandedOutputs}
        nodeTypes={nodeTypes}
        workflowTrigger={workflowTrigger}
      >
        <div ref={sidebar.containerRef} className="w-full h-full flex">
          <div
            className="h-full overflow-hidden relative"
            style={{
              width: sidebar.isSidebarVisible
                ? `calc(100% - ${sidebar.sidebarWidth}px)`
                : "100%",
            }}
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
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeDragStop={onNodeDragStop}
              onInit={setReactFlowInstance}
              onAddNode={readOnly ? undefined : handleAddNode}
              onAction={handleActionButtonClick}
              workflowStatus={execution.workflowStatus}
              workflowErrorMessage={execution.workflowErrorMessage}
              onToggleSidebar={
                sidebarEnabled ? sidebar.toggleSidebar : undefined
              }
              isSidebarVisible={
                sidebarEnabled ? sidebar.isSidebarVisible : false
              }
              isValidConnection={isValidConnection}
              disabled={readOnly}
              onFitToScreen={handleFitToScreen}
              selectedNodes={selectedNodes}
              selectedEdges={selectedEdges}
              onDeleteSelected={readOnly ? undefined : deleteSelected}
              onDuplicateSelected={readOnly ? undefined : duplicateSelected}
              onApplyLayout={readOnly ? undefined : applyLayout}
              onCopySelected={readOnly ? undefined : copySelected}
              onCutSelected={readOnly ? undefined : cutSelected}
              onPasteFromClipboard={readOnly ? undefined : pasteFromClipboard}
              hasClipboardData={hasClipboardData}
              showControls={interactive}
            />
          </div>

          {sidebar.isSidebarVisible && (
            <>
              <div
                className={cn(
                  "w-1 bg-background border-l border-border cursor-col-resize",
                  sidebar.isResizing && "bg-muted"
                )}
                onMouseDown={sidebar.handleResizeStart}
              />
              <div style={{ width: `${sidebar.sidebarWidth}px` }}>
                <WorkflowSidebar
                  nodes={nodes}
                  selectedNodes={selectedNodes}
                  selectedEdges={selectedEdges}
                  onNodeUpdate={readOnly ? undefined : updateNodeData}
                  onEdgeUpdate={readOnly ? undefined : updateEdgeData}
                  createObjectUrl={createObjectUrl}
                  disabledWorkflow={readOnly}
                  disabledFeedback={disabledFeedback}
                  workflowId={workflowId}
                  workflowName={workflowName}
                  workflowDescription={workflowDescription}
                  workflowTrigger={workflowTrigger}
                  workflowRuntime={workflowRuntime}
                  onWorkflowUpdate={readOnly ? undefined : onWorkflowUpdate}
                  workflowStatus={execution.workflowStatus}
                  workflowErrorMessage={execution.workflowErrorMessage}
                  executionId={execution.currentExecutionId}
                  isEnabled={isEnabled}
                  isTogglingEnabled={isTogglingEnabled}
                  onToggleEnabled={readOnly ? undefined : onToggleEnabled}
                  onTriggerChange={readOnly ? undefined : handleTriggerChange}
                />
              </div>
            </>
          )}

          <WorkflowNodeSelector
            open={readOnly ? false : isNodeSelectorOpen}
            onSelect={handleNodeSelect}
            onClose={() => setIsNodeSelectorOpen(false)}
            templates={nodeTypes}
            workflowName={workflowName}
            workflowDescription={workflowDescription}
            hasTriggerNode={hasTriggerNode}
          />
        </div>

        {(workflowTrigger === "http_webhook" ||
          workflowTrigger === "http_request") && (
          <HttpRequestConfigDialog
            isOpen={execution.isHttpRequestConfigDialogVisible}
            onClose={execution.closeExecutionForm}
            onSubmit={execution.submitHttpRequestConfig}
          />
        )}

        {workflowTrigger === "email_message" && (
          <ExecutionEmailDialog
            isOpen={execution.isEmailFormDialogVisible}
            onClose={execution.closeExecutionForm}
            onCancel={() => {
              execution.closeExecutionForm();
              execution.executeRef.current = null;
            }}
            onSubmit={execution.submitEmailFormData}
          />
        )}

        <Dialog
          open={execution.errorDialogOpen}
          onOpenChange={execution.setErrorDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Workflow Execution Error</DialogTitle>
              <DialogDescription>
                You have run out of compute credits. Thanks for checking out the
                preview. The code is available at
                https://github.com/dafthunk-com/dafthunk.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => execution.setErrorDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={triggerConfirmOpen}
          onOpenChange={setTriggerConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Trigger Type</AlertDialogTitle>
              <AlertDialogDescription>
                The current trigger node has configured inputs that will be
                lost. Are you sure you want to change the trigger type?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  pendingTriggerRef.current = null;
                  setTriggerConfirmOpen(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingTriggerRef.current) {
                    applyTriggerChange(pendingTriggerRef.current);
                    pendingTriggerRef.current = null;
                  }
                  setTriggerConfirmOpen(false);
                }}
              >
                Change Trigger
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </WorkflowProvider>
    </ReactFlowProvider>
  );
}
