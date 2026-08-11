import type {
  ObjectReference,
  UpdateWorkflowExampleRequest,
  WorkflowRuntime,
  WorkflowTrigger,
} from "@dafthunk/types";
import type {
  Connection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import { ExamplePicker } from "@/components/workflow/example-picker";
import {
  applyValues,
  captureValues,
  countValues,
} from "@/components/workflow/example-snapshot";
import {
  createExample,
  deleteExample,
  updateExample,
  useExamples,
} from "@/services/example-service";
import { cn } from "@/utils/utils";

import { ExecutionEmailDialog } from "./execution-email-dialog";
import { HttpRequestConfigDialog } from "./http-request-config-dialog";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import type { UseResizableSidebarReturn } from "./use-resizable-sidebar";
import { useResizableSidebar } from "./use-resizable-sidebar";
import { useWorkflowExecutionState } from "./use-workflow-execution-state";
import { useWorkflowState } from "./use-workflow-state";
import { FIT_VIEW_OPTIONS, WorkflowCanvas } from "./workflow-canvas";
import { WorkflowProvider } from "./workflow-context";
import { WorkflowErrorBoundary } from "./workflow-error-boundary";
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

/**
 * Which rendering of the graph is showing:
 * - "detail"   — The full cards: ports, widgets, fields. Where editing happens.
 * - "overview" — Schematic pills: icon, name, verdict. The picture the brief
 *                page draws while generating, so a freshly built workflow can
 *                open as the thing the user just watched.
 */
export type WorkflowBuilderView = "detail" | "overview";

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
  /**
   * Controlled view. When provided, the page owns the view axis: the internal
   * toggle disappears, and view changes the builder itself wants (a
   * double-click on a pill) are reported through `onViewChange` instead of
   * applied. When absent, the builder owns the axis and starts in detail.
   */
  view?: WorkflowBuilderView;
  onViewChange?: (view: WorkflowBuilderView) => void;
  /** Caller-supplied control centered over the canvas (not the page). */
  topCenterSlot?: React.ReactNode;
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
  /**
   * A caller-owned sidebar to render into instead of the builder's own —
   * the workflow page passes the panel it shares with Describe mode, so the
   * sidebar's width and collapsed state survive the mode flip.
   */
  sidebar?: UseResizableSidebarReturn;
  showBackground?: boolean;
  isEnabled?: boolean;
  isTogglingEnabled?: boolean;
  onToggleEnabled?: (checked: boolean) => void;
  fitViewPadding?: number;
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
  view,
  onViewChange,
  topCenterSlot,
  disabledFeedback = false,
  createObjectUrl,
  expandedOutputs = false,
  workflowName,
  workflowDescription,
  onWorkflowUpdate,
  orgId,
  wsExecuteWorkflow,
  showSidebar,
  sidebar: externalSidebar,
  showBackground = true,
  isEnabled,
  isTogglingEnabled,
  onToggleEnabled,
  fitViewPadding = FIT_VIEW_OPTIONS.padding,
}: WorkflowBuilderProps) {
  const readOnly = mode !== "edit";
  const interactive = mode !== "preview";
  const sidebarEnabled = showSidebar ?? interactive;

  // Overview is a way of looking, not a mode of its own: it renders the graph
  // as schematic pills and suspends graph surgery while it is up, whatever the
  // builder mode. Editing only ever happens in the detail view.
  const viewControlled = view !== undefined;
  const [internalOverview, setInternalOverview] = useState(false);
  const overview = viewControlled ? view === "overview" : internalOverview;
  const editing = !readOnly && !overview;

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
    applyNodeExecutions,
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
    onNodeDragStart,
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
    applyNodeExecutions,
    deselectAll,
  });

  // Sidebar — the internal hook is always called (hooks can't be
  // conditional) but yields to a caller-owned panel when one is provided.
  const internalSidebar = useResizableSidebar({
    initialVisible: sidebarEnabled,
  });
  const sidebar = externalSidebar ?? internalSidebar;

  // Keyboard shortcuts (Cmd+C/X/V/D + Cmd+Enter)
  const handleActionButtonClick =
    !readOnly && executeWorkflow
      ? execution.handleActionButtonClick
      : undefined;

  useKeyboardShortcuts({
    disabled: readOnly || overview,
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
    reactFlowInstance?.fitView({
      padding: fitViewPadding,
      duration: 200,
      maxZoom: FIT_VIEW_OPTIONS.maxZoom,
    });
  }, [reactFlowInstance, fitViewPadding]);

  // Switching views swaps every node's renderer, so the camera has to wait
  // two frames — one for React to commit the swap, one for React Flow to
  // re-measure the new renderers — before fitView can frame them honestly.
  // An effect rather than part of setView, because a controlled view can
  // change without setView ever being called (the page's own toggle).
  const framedOverviewRef = useRef(overview);
  useEffect(() => {
    if (framedOverviewRef.current === overview) return;
    framedOverviewRef.current = overview;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        reactFlowInstance?.fitView({
          padding: fitViewPadding,
          duration: 300,
          maxZoom: FIT_VIEW_OPTIONS.maxZoom,
        });
      })
    );
    return () => cancelAnimationFrame(frame);
  }, [overview, reactFlowInstance, fitViewPadding]);

  const setView = useCallback(
    (next: boolean) => {
      if (viewControlled) {
        onViewChange?.(next ? "overview" : "detail");
        return;
      }
      setInternalOverview(next);
    },
    [viewControlled, onViewChange]
  );

  const handleToggleOverview = useCallback(() => {
    setView(!overview);
  }, [setView, overview]);

  const handleNodeDoubleClick = useCallback(() => {
    // In overview a double-click means "show me the wiring" — the graph
    // expands to detail. In detail it opens the inspector, as ever.
    if (overview) {
      setView(false);
      return;
    }
    sidebar.setIsSidebarVisible(true);
  }, [overview, setView, sidebar]);

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

  // Examples live here rather than in the page because applying one writes
  // values onto the nodes, and `updateNodeData` is only in scope inside the
  // builder. Keeping the capture/apply pair next to the graph it acts on also
  // means the picker itself stays presentational.
  // Read-only viewers never render the picker, so asking for the examples there
  // is a request whose response is discarded.
  const { examples, mutateExamples } = useExamples(
    orgId,
    readOnly ? undefined : workflowId
  );
  const [activeExampleId, setActiveExampleId] = useState<string | undefined>();

  const withExamples = useCallback(
    async (action: () => Promise<unknown>, failure: string) => {
      try {
        await action();
        await mutateExamples();
      } catch (error) {
        console.error(failure, error);
        toast.error(error instanceof Error ? error.message : failure);
      }
    },
    [mutateExamples]
  );

  /** Rename and set-default are the same call: PATCH one field, then refetch. */
  const patchExample = useCallback(
    (
      exampleId: string,
      body: UpdateWorkflowExampleRequest,
      failure: string
    ): void => {
      if (!orgId || !workflowId) return;
      void withExamples(
        () => updateExample(orgId, workflowId, exampleId, body),
        failure
      );
    },
    [orgId, workflowId, withExamples]
  );

  const examplePicker =
    !readOnly && orgId && workflowId ? (
      <ExamplePicker
        examples={examples}
        activeId={activeExampleId}
        onApply={(example) => {
          const applied = applyValues(
            example.nodeValues ?? {},
            nodes,
            updateNodeData
          );
          setActiveExampleId(example.id);
          toast.success(
            applied > 0
              ? `Applied ${applied} ${applied === 1 ? "value" : "values"} from “${example.name}”`
              : `“${example.name}” has no values that match this workflow`
          );
        }}
        onSaveCurrent={(name) =>
          void withExamples(async () => {
            const values = captureValues(nodes, edges);
            const created = await createExample(orgId, workflowId, {
              name,
              nodeValues: values,
            });
            setActiveExampleId(created.id);
            const count = countValues(values);
            toast.success(`Saved ${count} ${count === 1 ? "value" : "values"}`);
          }, "Could not save the example")
        }
        onUpdate={(example) =>
          void withExamples(async () => {
            const values = captureValues(nodes, edges);
            await updateExample(orgId, workflowId, example.id, {
              nodeValues: values,
            });
            // The example now holds what is on the canvas, so it is what the
            // canvas is showing — whichever example was checked before.
            setActiveExampleId(example.id);
            toast.success(`Updated “${example.name}”`);
          }, "Could not update the example")
        }
        onRename={(exampleId, name) =>
          patchExample(exampleId, { name }, "Could not rename the example")
        }
        onSetDefault={(exampleId) =>
          patchExample(
            exampleId,
            { isDefault: true },
            "Could not set the default"
          )
        }
        onDelete={(exampleId) =>
          void withExamples(async () => {
            await deleteExample(orgId, workflowId, exampleId);
            if (activeExampleId === exampleId) setActiveExampleId(undefined);
          }, "Could not delete the example")
        }
      />
    ) : undefined;

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
        <div className="w-full h-full flex">
          <div
            className="h-full overflow-hidden relative"
            style={{
              width: sidebar.isSidebarVisible
                ? `calc(100% - ${sidebar.sidebarWidth}px)`
                : "100%",
            }}
          >
            <WorkflowErrorBoundary resetKey={workflowId}>
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
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}
                onInit={setReactFlowInstance}
                onAddNode={editing ? handleAddNode : undefined}
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
                onDeleteSelected={editing ? deleteSelected : undefined}
                onDuplicateSelected={editing ? duplicateSelected : undefined}
                onApplyLayout={editing ? applyLayout : undefined}
                onCopySelected={editing ? copySelected : undefined}
                onCutSelected={editing ? cutSelected : undefined}
                onPasteFromClipboard={editing ? pasteFromClipboard : undefined}
                hasClipboardData={hasClipboardData}
                showControls={interactive}
                runSlot={examplePicker}
                topCenterSlot={topCenterSlot}
                showBackground={showBackground}
                fitViewPadding={fitViewPadding}
                overview={overview}
                // The embedded toggle yields when the page owns the view
                // axis; a double-click on a pill still reports through
                // onViewChange either way.
                onToggleOverview={
                  interactive && !viewControlled
                    ? handleToggleOverview
                    : undefined
                }
              />
            </WorkflowErrorBoundary>
          </div>

          {sidebar.isSidebarVisible && (
            <>
              <div
                className={cn(
                  "w-1 bg-neutral-50 border-l border-border cursor-col-resize",
                  sidebar.isResizing && "bg-muted"
                )}
                onMouseDown={sidebar.handleResizeStart}
              />
              <div style={{ width: `${sidebar.sidebarWidth}px` }}>
                {/* Separate boundary: an inspector crash (usually a malformed
                    value in one field) must not take the canvas down with it. */}
                <WorkflowErrorBoundary
                  resetKey={selectedNodes[0]?.id ?? selectedEdges[0]?.id ?? ""}
                >
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
                </WorkflowErrorBoundary>
              </div>
            </>
          )}

          <WorkflowNodeSelector
            open={editing ? isNodeSelectorOpen : false}
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
