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
import { useCallback, useState } from "react";

import { cn } from "@/utils/utils";

import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { useResizableSidebar } from "./use-resizable-sidebar";
import { useWorkflowExecutionState } from "./use-workflow-execution-state";
import { useWorkflowState } from "./use-workflow-state";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowProvider } from "./workflow-context";
import { WorkflowDialogs } from "./workflow-dialogs";
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
  onDeployWorkflow?: (e: React.MouseEvent) => void;
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
  orgHandle: string;
  deploymentVersions?: number[];
  mutateDeploymentHistory?: () => void;
  wsExecuteWorkflow?: (options?: {
    parameters?: Record<string, unknown>;
  }) => void;
  showSidebar?: boolean;
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
  onDeployWorkflow,
  createObjectUrl,
  expandedOutputs = false,
  workflowName,
  workflowDescription,
  onWorkflowUpdate,
  orgHandle,
  deploymentVersions: _deploymentVersions = [],
  mutateDeploymentHistory: _mutateDeploymentHistory,
  wsExecuteWorkflow,
  showSidebar,
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
  } = useWorkflowState({
    initialNodes,
    initialEdges,
    onNodesChangePersist: onNodesChangeFromParent,
    onEdgesChangePersist: onEdgesChangeFromParent,
    validateConnection,
    createObjectUrl,
    disabled: readOnly,
  });

  // Execution state
  const execution = useWorkflowExecutionState({
    workflowId,
    workflowTrigger,
    orgHandle,
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

  // Trigger dialog state (shared between canvas buttons and dialog component)
  const [isHttpIntegrationDialogOpen, setIsHttpIntegrationDialogOpen] =
    useState(false);
  const [isEmailTriggerDialogOpen, setIsEmailTriggerDialogOpen] =
    useState(false);

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
              onDeploy={
                !readOnly && onDeployWorkflow ? onDeployWorkflow : undefined
              }
              workflowStatus={execution.workflowStatus}
              workflowErrorMessage={execution.workflowErrorMessage}
              workflowTrigger={workflowTrigger}
              onShowHttpIntegration={
                workflowTrigger === "http_webhook" ||
                workflowTrigger === "http_request"
                  ? () => setIsHttpIntegrationDialogOpen(true)
                  : undefined
              }
              onShowEmailTrigger={
                workflowTrigger === "email_message"
                  ? () => setIsEmailTriggerDialogOpen(true)
                  : undefined
              }
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
                  workflowName={workflowName}
                  workflowDescription={workflowDescription}
                  workflowTrigger={workflowTrigger}
                  workflowRuntime={workflowRuntime}
                  onWorkflowUpdate={readOnly ? undefined : onWorkflowUpdate}
                  workflowStatus={execution.workflowStatus}
                  workflowErrorMessage={execution.workflowErrorMessage}
                  executionId={execution.currentExecutionId}
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
            workflowTrigger={workflowTrigger}
          />
        </div>

        <WorkflowDialogs
          workflowId={workflowId}
          workflowTrigger={workflowTrigger}
          orgHandle={orgHandle}
          nodes={nodes}
          nodeTypes={nodeTypes}
          isHttpIntegrationDialogOpen={isHttpIntegrationDialogOpen}
          onCloseHttpIntegration={() =>
            setIsHttpIntegrationDialogOpen(false)
          }
          isEmailTriggerDialogOpen={isEmailTriggerDialogOpen}
          onCloseEmailTrigger={() => setIsEmailTriggerDialogOpen(false)}
          isEmailFormDialogVisible={execution.isEmailFormDialogVisible}
          isHttpRequestConfigDialogVisible={
            execution.isHttpRequestConfigDialogVisible
          }
          submitHttpRequestConfig={execution.submitHttpRequestConfig}
          submitEmailFormData={execution.submitEmailFormData}
          closeExecutionForm={execution.closeExecutionForm}
          executeRef={execution.executeRef}
          errorDialogOpen={execution.errorDialogOpen}
          setErrorDialogOpen={execution.setErrorDialogOpen}
        />
      </WorkflowProvider>
    </ReactFlowProvider>
  );
}
