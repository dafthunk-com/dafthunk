import type { ObjectReference } from "@dafthunk/types";
import type {
  Connection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useWorkflowState } from "./use-workflow-state";
import { WorkflowCanvas } from "./workflow-canvas";
import { updateNodeName, WorkflowProvider } from "./workflow-context";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { WorkflowSidebar } from "./workflow-sidebar";
import type {
  NodeTemplate,
  WorkflowEdgeType,
  WorkflowExecution,
  WorkflowExecutionStatus,
  WorkflowNodeType,
} from "./workflow-types";

export interface WorkflowBuilderProps {
  workflowId: string;
  workflowType?: string;
  initialNodes?: ReactFlowNode<WorkflowNodeType>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeType>[];
  nodeTemplates?: NodeTemplate[];
  onNodesChange?: (nodes: ReactFlowNode<WorkflowNodeType>[]) => void;
  onEdgesChange?: (edges: ReactFlowEdge<WorkflowEdgeType>[]) => void;
  validateConnection?: (connection: Connection) => boolean;
  executeWorkflow?: (
    workflowId: string,
    onExecution: (execution: WorkflowExecution) => void
  ) => void | (() => void | Promise<void>);
  initialWorkflowExecution?: WorkflowExecution;
  readonly?: boolean;
  onDeployWorkflow?: (e: React.MouseEvent) => void;
  onSetSchedule?: () => void;
  createObjectUrl: (objectReference: ObjectReference) => string;
  expandedOutputs?: boolean;
}

export function WorkflowBuilder({
  workflowId,
  workflowType,
  initialNodes = [],
  initialEdges = [],
  nodeTemplates = [],
  onNodesChange: onNodesChangeFromParent,
  onEdgesChange: onEdgesChangeFromParent,
  validateConnection,
  executeWorkflow,
  initialWorkflowExecution,
  readonly = false,
  onDeployWorkflow,
  onSetSchedule,
  createObjectUrl,
  expandedOutputs = false,
}: WorkflowBuilderProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowExecutionStatus>(
    initialWorkflowExecution?.status || "idle"
  );
  const [currentExpandedOutputs, setCurrentExpandedOutputs] =
    useState(expandedOutputs);
  const [errorDialogState, setErrorDialogState] = useState<{
    open: boolean;
    message: string;
  }>({
    open:
      initialWorkflowExecution?.status === "error" &&
      !!initialWorkflowExecution.nodeExecutions.find((n) => n.error),
    message:
      initialWorkflowExecution?.nodeExecutions.find((n) => n.error)?.error ||
      "",
  });
  const cleanupRef = useRef<(() => void | Promise<void>) | null>(null);
  const initializedRef = useRef(false);
  const [nodeNameToEdit, setNodeNameToEdit] = useState("");

  const {
    nodes,
    edges,
    selectedNode: handleSelectedNode,
    selectedEdge: handleSelectedEdge,
    isNodeSelectorOpen: handleIsNodeSelectorOpen,
    setIsNodeSelectorOpen: handleSetIsNodeSelectorOpen,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleAddNode,
    handleNodeSelect,
    updateNodeExecution,
    setReactFlowInstance,
    reactFlowInstance,
    connectionValidationState,
    isValidConnection,
    updateNodeData,
    updateEdgeData,
    deleteSelectedElement,
    isEditNodeNameDialogOpen,
    toggleEditNodeNameDialog,
    applyLayout,
  } = useWorkflowState({
    initialNodes,
    initialEdges,
    onNodesChangePersist: onNodesChangeFromParent,
    onEdgesChangePersist: onEdgesChangeFromParent,
    validateConnection,
    createObjectUrl,
    readonly,
  });

  // Track input and output connections
  useEffect(() => {
    if (readonly) return; // Skip connection tracking in readonly mode

    const connectedInputs = new Map();
    const connectedOutputs = new Map();

    edges.forEach((edge) => {
      if (edge.targetHandle)
        connectedInputs.set(`${edge.target}-${edge.targetHandle}`, true);
      if (edge.sourceHandle)
        connectedOutputs.set(`${edge.source}-${edge.sourceHandle}`, true);
    });

    nodes.forEach((node) => {
      const updatedInputs = node.data.inputs.map((input) => ({
        ...input,
        isConnected: connectedInputs.has(`${node.id}-${input.id}`),
      }));

      const updatedOutputs = node.data.outputs.map((output) => ({
        ...output,
        isConnected: connectedOutputs.has(`${node.id}-${output.id}`),
      }));

      const inputChanged = updatedInputs.some(
        (input, i) => input.isConnected !== node.data.inputs[i].isConnected
      );

      const outputChanged = updatedOutputs.some(
        (output, i) => output.isConnected !== node.data.outputs[i].isConnected
      );

      if (inputChanged || outputChanged) {
        updateNodeData(node.id, {
          inputs: updatedInputs,
          outputs: updatedOutputs,
        });
      }
    });
  }, [edges, nodes, updateNodeData, readonly]);

  // Apply initial workflow execution state
  useEffect(() => {
    // Only apply the initial state once
    if (
      initialWorkflowExecution &&
      !initializedRef.current &&
      nodes.length > 0
    ) {
      initializedRef.current = true;
      setWorkflowStatus(initialWorkflowExecution.status);

      console.log(
        "Initializing workflow with execution:",
        initialWorkflowExecution
      );

      // Process each node execution
      initialWorkflowExecution.nodeExecutions.forEach((nodeExec) => {
        const node = nodes.find((n) => n.id === nodeExec.nodeId);
        if (!node) {
          console.warn(`Node not found for execution: ${nodeExec.nodeId}`);
          return;
        }

        console.log(`Processing node ${nodeExec.nodeId}:`, {
          node: node.data,
          execution: nodeExec,
        });

        // Create updated outputs with values
        const updatedOutputs = node.data.outputs.map((output) => {
          // Try to find the output value using both id and name
          let outputValue = undefined;
          if (nodeExec.outputs) {
            // First check by id
            outputValue = nodeExec.outputs[output.id];

            // If not found, check by name
            if (outputValue === undefined) {
              outputValue = nodeExec.outputs[output.name];
            }
          }

          console.log(`Output ${output.name}:`, {
            original: output.value,
            new: outputValue,
            nodeExecutionOutputs: nodeExec.outputs,
          });

          return {
            ...output,
            value: outputValue,
          };
        });

        console.log(`Updated outputs for ${nodeExec.nodeId}:`, updatedOutputs);

        // Force the executionState to be completed even if it's not in the execution
        // This ensures the outputs are displayed
        const executionState =
          nodeExec.status === "idle" &&
          updatedOutputs.some((o) => o.value !== undefined)
            ? "completed"
            : nodeExec.status;

        // Update the node data
        updateNodeData(nodeExec.nodeId, {
          outputs: updatedOutputs,
          executionState: executionState,
          error: nodeExec.error,
        });
      });

      // Handle error dialog if execution failed
      if (initialWorkflowExecution.status === "error") {
        const errorNode = initialWorkflowExecution.nodeExecutions.find(
          (n) => n.error
        );
        if (errorNode) {
          setErrorDialogState({
            open: true,
            message: errorNode.error || "Unknown error",
          });
        }
      }
    }
  }, [initialWorkflowExecution, nodes, updateNodeData]);

  // Update nodeNameToEdit when the dialog is opened and a node is selected
  useEffect(() => {
    if (isEditNodeNameDialogOpen && handleSelectedNode) {
      setNodeNameToEdit(handleSelectedNode.data.name);
    } else if (!isEditNodeNameDialogOpen) {
      // Optionally reset when dialog closes, or leave as is if preferred
      // setNodeNameToEdit("");
    }
  }, [isEditNodeNameDialogOpen, handleSelectedNode]);

  const resetNodeStates = useCallback(() => {
    nodes.forEach((node) => {
      updateNodeExecution(node.id, {
        state: "idle",
        outputs: {},
        error: undefined,
      });
    });
  }, [nodes, updateNodeExecution]);

  const handleExecute = useCallback(() => {
    if (!executeWorkflow) return null;

    resetNodeStates();
    setWorkflowStatus("executing"); // Local immediate update

    return executeWorkflow(workflowId, (execution: WorkflowExecution) => {
      // Only update status if the new status is not 'idle' while we are 'executing',
      // or if the local status is not 'executing' anymore (e.g., already completed/errored).
      setWorkflowStatus((currentStatus) => {
        if (currentStatus === "executing" && execution.status === "submitted") {
          return currentStatus; // Ignore initial idle updates while executing
        }
        return execution.status; // Apply other status updates
      });

      execution.nodeExecutions.forEach((nodeExecution) => {
        updateNodeExecution(nodeExecution.nodeId, {
          state: nodeExecution.status,
          outputs: nodeExecution.outputs || {},
          error: nodeExecution.error,
        });
      });

      if (execution.status === "error") {
        setErrorDialogState({
          open: true,
          message:
            execution.nodeExecutions.find((n) => n.error)?.error ||
            "Unknown error",
        });
      }
    });
  }, [executeWorkflow, workflowId, resetNodeStates, updateNodeExecution]);

  const handleActionButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      switch (workflowStatus) {
        case "idle": {
          const cleanup = handleExecute();
          if (cleanup) cleanupRef.current = cleanup;
          break;
        }
        case "submitted":
        case "executing": {
          if (cleanupRef.current) {
            const cleanup = cleanupRef.current();
            if (cleanup instanceof Promise) {
              cleanup.catch((error) => {
                console.error("Error during cleanup:", error);
              });
            }
            cleanupRef.current = null;
          }
          setWorkflowStatus("cancelled");
          break;
        }
        case "completed":
        case "error": {
          resetNodeStates();
          setWorkflowStatus("idle");
          break;
        }
        case "cancelled": {
          resetNodeStates();
          const cleanup = handleExecute();
          if (cleanup) cleanupRef.current = cleanup;
          break;
        }
      }
    },
    [workflowStatus, handleExecute, resetNodeStates]
  );

  const toggleSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSidebarVisible((prev) => !prev);
  }, []);

  const toggleExpandedOutputs = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentExpandedOutputs((prev) => !prev);
  }, []);

  const handleFitToScreen = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.25, duration: 200 });
      }
    },
    [reactFlowInstance]
  );

  return (
    <ReactFlowProvider>
      <WorkflowProvider
        updateNodeData={readonly ? undefined : updateNodeData}
        updateEdgeData={readonly ? undefined : updateEdgeData}
        readonly={readonly}
        expandedOutputs={currentExpandedOutputs}
      >
        <div className="w-full h-full flex">
          <div
            className={`h-full overflow-hidden relative ${isSidebarVisible ? "w-[calc(100%-384px)]" : "w-full"}`}
          >
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              connectionValidationState={connectionValidationState}
              onNodesChange={readonly ? () => {} : onNodesChange}
              onEdgesChange={readonly ? () => {} : onEdgesChange}
              onConnect={readonly ? () => {} : onConnect}
              onConnectStart={readonly ? () => {} : onConnectStart}
              onConnectEnd={readonly ? () => {} : onConnectEnd}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onPaneClick={handlePaneClick}
              onInit={setReactFlowInstance}
              onAddNode={readonly ? undefined : handleAddNode}
              onAction={
                !readonly && executeWorkflow
                  ? handleActionButtonClick
                  : undefined
              }
              onDeploy={
                !readonly && onDeployWorkflow ? onDeployWorkflow : undefined
              }
              workflowStatus={workflowStatus}
              workflowType={workflowType}
              onSetSchedule={onSetSchedule}
              onToggleSidebar={toggleSidebar}
              isSidebarVisible={isSidebarVisible}
              isValidConnection={isValidConnection}
              readonly={readonly}
              expandedOutputs={currentExpandedOutputs}
              onToggleExpandedOutputs={toggleExpandedOutputs}
              onFitToScreen={handleFitToScreen}
              selectedNode={handleSelectedNode}
              selectedEdge={handleSelectedEdge}
              onDeleteSelected={readonly ? undefined : deleteSelectedElement}
              onEditLabel={
                readonly ? undefined : () => toggleEditNodeNameDialog(true)
              }
              onApplyLayout={readonly ? undefined : applyLayout}
            />
          </div>

          {isSidebarVisible && (
            <div className="w-96">
              <WorkflowSidebar
                node={handleSelectedNode}
                edge={handleSelectedEdge}
                onNodeUpdate={readonly ? undefined : updateNodeData}
                onEdgeUpdate={readonly ? undefined : updateEdgeData}
                createObjectUrl={createObjectUrl}
                readonly={readonly}
              />
            </div>
          )}

          <WorkflowNodeSelector
            open={readonly ? false : handleIsNodeSelectorOpen}
            onSelect={handleNodeSelect}
            onClose={() => handleSetIsNodeSelectorOpen(false)}
            templates={nodeTemplates}
          />
        </div>

        <Dialog
          open={errorDialogState.open}
          onOpenChange={(open) =>
            setErrorDialogState((prev) => ({ ...prev, open }))
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Workflow Execution Error</DialogTitle>
              <DialogDescription>{errorDialogState.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() =>
                  setErrorDialogState((prev) => ({ ...prev, open: false }))
                }
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isEditNodeNameDialogOpen && !readonly && !!handleSelectedNode}
          onOpenChange={(open) => {
            if (!open) {
              toggleEditNodeNameDialog(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Node Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label
                  htmlFor="node-name-input"
                  className="text-sm font-medium"
                >
                  Node Label
                </Label>
                <Input
                  id="node-name-input"
                  value={nodeNameToEdit}
                  onChange={(e) => setNodeNameToEdit(e.target.value)}
                  placeholder="Enter node name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (handleSelectedNode && nodeNameToEdit.trim() !== "") {
                        updateNodeName(
                          handleSelectedNode.id,
                          nodeNameToEdit,
                          updateNodeData
                        );
                      }
                      toggleEditNodeNameDialog(false);
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => toggleEditNodeNameDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (handleSelectedNode && nodeNameToEdit.trim() !== "") {
                    updateNodeName(
                      handleSelectedNode.id,
                      nodeNameToEdit,
                      updateNodeData
                    );
                  }
                  toggleEditNodeNameDialog(false);
                }}
                disabled={!nodeNameToEdit.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </WorkflowProvider>
    </ReactFlowProvider>
  );
}
