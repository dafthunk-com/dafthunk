import type { ObjectReference } from "@dafthunk/types";
import type {
  Connection,
  IsValidConnection,
  NodeChange,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  OnEdgesChange,
  OnNodesChange,
  Edge as ReactFlowEdge,
  ReactFlowInstance,
  Node as ReactFlowNode,
} from "@xyflow/react";
import {
  addEdge,
  getConnectedEdges,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ConnectionValidationState,
  NodeExecutionState,
  NodeExecutionUpdate,
  NodeType,
  WorkflowEdgeType,
  WorkflowNodeType,
  WorkflowParameter,
} from "./workflow-types";

// --- Pure helper functions ---

function updateNodesWithExecutionState(
  nodes: ReactFlowNode<WorkflowNodeType>[],
  nodeId: string,
  state: NodeExecutionState
): ReactFlowNode<WorkflowNodeType>[] {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          data: {
            ...node.data,
            executionState: state,
            error: state === "error" ? node.data.error : null,
          },
        }
      : node
  );
}

function updateEdgesForNodeExecution(
  edges: ReactFlowEdge<WorkflowEdgeType>[],
  state: NodeExecutionState,
  connectedEdgeIds: string[]
): ReactFlowEdge<WorkflowEdgeType>[] {
  if (state === "executing") {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...(edge.data || {}),
        isActive: connectedEdgeIds.includes(edge.id),
      },
    }));
  }

  if (state === "completed" || state === "error") {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...(edge.data || {}),
        isActive: false,
      },
    }));
  }

  return edges;
}

function updateNodesWithExecutionOutputs(
  nodes: ReactFlowNode<WorkflowNodeType>[],
  nodeId: string,
  outputs: Record<string, unknown>
): ReactFlowNode<WorkflowNodeType>[] {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          data: {
            ...node.data,
            outputs: node.data.outputs.map(
              (output) =>
                ({
                  ...output,
                  value: outputs[output.id] ?? outputs[output.name],
                }) as WorkflowParameter
            ),
          },
        }
      : node
  );
}

function updateNodesWithExecutionError(
  nodes: ReactFlowNode<WorkflowNodeType>[],
  nodeId: string,
  error: string | undefined
): ReactFlowNode<WorkflowNodeType>[] {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          data: {
            ...node.data,
            error,
          },
        }
      : node
  );
}

// --- Hook interface ---

export interface UseGraphOperationsProps {
  initialNodes?: ReactFlowNode<WorkflowNodeType>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeType>[];
  validateConnection?: (connection: Connection) => boolean;
  createObjectUrl: (objectReference: ObjectReference) => string;
  disabled?: boolean;
}

export interface UseGraphOperationsReturn {
  // State
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  selectedNodes: ReactFlowNode<WorkflowNodeType>[];
  selectedEdges: ReactFlowEdge<WorkflowEdgeType>[];
  reactFlowInstance: ReactFlowInstance<
    ReactFlowNode<WorkflowNodeType>,
    ReactFlowEdge<WorkflowEdgeType>
  > | null;
  isNodeSelectorOpen: boolean;
  connectionValidationState: ConnectionValidationState;

  // Setters (needed by sub-hooks and composition)
  setNodes: React.Dispatch<
    React.SetStateAction<ReactFlowNode<WorkflowNodeType>[]>
  >;
  setEdges: React.Dispatch<
    React.SetStateAction<ReactFlowEdge<WorkflowEdgeType>[]>
  >;
  setIsNodeSelectorOpen: (open: boolean) => void;
  setReactFlowInstance: (
    instance: ReactFlowInstance<
      ReactFlowNode<WorkflowNodeType>,
      ReactFlowEdge<WorkflowEdgeType>
    > | null
  ) => void;
  nodesRef: React.RefObject<ReactFlowNode<WorkflowNodeType>[]>;
  edgesRef: React.RefObject<ReactFlowEdge<WorkflowEdgeType>[]>;

  // Event handlers
  onNodesChange: OnNodesChange<ReactFlowNode<WorkflowNodeType>>;
  onEdgesChange: OnEdgesChange<ReactFlowEdge<WorkflowEdgeType>>;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onNodeDragStop: (
    event: React.MouseEvent,
    node: ReactFlowNode<WorkflowNodeType>
  ) => void;
  isValidConnection: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;

  // Actions
  handleAddNode: () => void;
  handleNodeSelect: (template: NodeType) => void;
  updateNodeExecution: (nodeId: string, update: NodeExecutionUpdate) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  deleteSelected: () => void;
  deselectAll: () => void;
}

const NOOP = () => {};

export function useGraphOperations({
  initialNodes = [],
  initialEdges = [],
  validateConnection = () => true,
  createObjectUrl,
  disabled = false,
}: UseGraphOperationsProps): UseGraphOperationsReturn {
  // Core state
  const [nodes, setNodes, onNodesChange] =
    useNodesState<ReactFlowNode<WorkflowNodeType>>(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<ReactFlowEdge<WorkflowEdgeType>>(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    ReactFlowNode<WorkflowNodeType>,
    ReactFlowEdge<WorkflowEdgeType>
  > | null>(null);
  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [connectionValidationState, setConnectionValidationState] =
    useState<ConnectionValidationState>("default");

  const nodesRef = useRef(initialNodes);
  const edgesRef = useRef(initialEdges);

  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedEdges = edges.filter((edge) => edge.selected);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Sync initialNodes prop
  useEffect(() => {
    const newNodesWithCreateObjectUrl = initialNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        createObjectUrl,
      },
    }));

    if (!disabled && initialNodes.length === 0 && nodesRef.current.length > 0) {
      return;
    }

    const newNodesStrippedForCompare = newNodesWithCreateObjectUrl.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { ...n.data, createObjectUrl: undefined },
    }));
    const currentNodesStrippedForCompare = nodesRef.current.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { ...n.data, createObjectUrl: undefined },
    }));

    const newNodesStructurallyDifferent =
      JSON.stringify(newNodesStrippedForCompare) !==
      JSON.stringify(currentNodesStrippedForCompare);

    const anyCurrentNodeMissingFunction =
      newNodesWithCreateObjectUrl.length > 0 &&
      nodesRef.current.some(
        (n) => typeof n.data.createObjectUrl !== "function"
      );

    if (newNodesStructurallyDifferent || anyCurrentNodeMissingFunction) {
      const currentNodesById = new Map(nodesRef.current.map((n) => [n.id, n]));
      const updatedNodes = newNodesWithCreateObjectUrl.map((newNode) => {
        const currentNode = currentNodesById.get(newNode.id);
        if (currentNode) {
          return {
            ...newNode,
            selected: currentNode.selected,
            dragging: currentNode.dragging,
          };
        }
        return newNode;
      });

      setNodes(updatedNodes);
    }
  }, [initialNodes, disabled, setNodes, createObjectUrl]);

  // Sync initialEdges prop
  useEffect(() => {
    if (!disabled && initialEdges.length === 0 && edgesRef.current.length > 0) {
      return;
    }
    if (JSON.stringify(edgesRef.current) !== JSON.stringify(initialEdges)) {
      setEdges(initialEdges);
    }
  }, [initialEdges, disabled, setEdges]);

  // In disabled mode, only allow selection changes
  const handleNodesChangeInternal = useCallback(
    (changes: NodeChange<ReactFlowNode<WorkflowNodeType>>[]) => {
      if (disabled) {
        const selectionChanges = changes.filter(
          (change) => change.type === "select"
        );
        if (selectionChanges.length > 0) {
          onNodesChange(selectionChanges);
        }
        return;
      }
      onNodesChange(changes);
    },
    [onNodesChange, disabled]
  );

  // Connection event handlers
  const onConnectStart = useCallback(() => {
    if (disabled) return;
    setConnectionValidationState("default");
  }, [disabled]);

  const onConnectEnd = useCallback(() => {
    if (disabled) return;
    setConnectionValidationState("default");
  }, [disabled]);

  // Connection validation
  const isValidConnection: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>> =
    useCallback(
      (connection) => {
        if (disabled) return false;
        if (!connection.source || !connection.target) return false;

        // Normalize to Connection shape (Edge has optional sourceHandle/targetHandle)
        const conn: Connection = {
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
        };

        const sourceNode = nodes.find((node) => node.id === conn.source);
        const targetNode = nodes.find((node) => node.id === conn.target);
        if (!sourceNode || !targetNode) return false;

        const sourceOutput = sourceNode.data.outputs.find(
          (output) => output.id === conn.sourceHandle
        );
        const sourceInput = sourceNode.data.inputs.find(
          (input) => input.id === conn.sourceHandle
        );

        const targetInput = targetNode.data.inputs.find(
          (input) => input.id === conn.targetHandle
        );
        const targetOutput = targetNode.data.outputs.find(
          (output) => output.id === conn.targetHandle
        );

        let inputParam, outputParam, inputNodeId, inputHandleId;

        if (sourceOutput && targetInput) {
          outputParam = sourceOutput;
          inputParam = targetInput;
          inputNodeId = conn.target;
          inputHandleId = conn.targetHandle;
        } else if (sourceInput && targetOutput) {
          outputParam = targetOutput;
          inputParam = sourceInput;
          inputNodeId = conn.source;
          inputHandleId = conn.sourceHandle;
        } else {
          setConnectionValidationState("invalid");
          return false;
        }

        const blobTypes = new Set([
          "image",
          "audio",
          "document",
          "buffergeometry",
          "gltf",
        ]);

        const exactMatch = outputParam.type === inputParam.type;
        const anyTypeMatch =
          outputParam.type === "any" || inputParam.type === "any";
        const blobCompatible =
          (outputParam.type === "blob" && blobTypes.has(inputParam.type)) ||
          (inputParam.type === "blob" && blobTypes.has(outputParam.type));

        const typesMatch = exactMatch || anyTypeMatch || blobCompatible;

        if (!inputParam.repeated) {
          const hasExistingConnection = edges.some(
            (edge) =>
              (edge.target === inputNodeId &&
                edge.targetHandle === inputHandleId) ||
              (edge.source === inputNodeId &&
                edge.sourceHandle === inputHandleId)
          );
          if (hasExistingConnection) {
            setConnectionValidationState("invalid");
            return false;
          }
        }

        setConnectionValidationState(typesMatch ? "valid" : "invalid");
        return typesMatch && validateConnection(conn);
      },
      [nodes, edges, validateConnection, disabled]
    );

  // Handle connection
  const onConnect = useCallback(
    (connection: Connection) => {
      if (disabled) return;
      if (!connection.source || !connection.target) return;
      if (!isValidConnection(connection)) return;

      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const targetInput = targetNode.data.inputs.find(
        (input) => input.id === connection.targetHandle
      );
      const sourceInput = sourceNode.data.inputs.find(
        (input) => input.id === connection.sourceHandle
      );

      const inputNodeId = targetInput ? connection.target : connection.source;
      const inputHandleId = targetInput
        ? connection.targetHandle
        : connection.sourceHandle;
      const acceptsMultipleConnections =
        targetInput?.repeated || sourceInput?.repeated || false;

      const newEdge: ReactFlowEdge<WorkflowEdgeType> = {
        ...connection,
        id: `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}-${Date.now()}`,
        type: "workflowEdge",
        data: {
          isValid: true,
          isActive: false,
          sourceType: connection.sourceHandle ?? undefined,
          targetType: connection.targetHandle ?? undefined,
          createObjectUrl,
        },
        zIndex: 0,
      };

      setEdges((eds) => {
        let filteredEdges = eds;

        if (!acceptsMultipleConnections) {
          filteredEdges = eds.filter(
            (edge) =>
              !(
                (edge.target === inputNodeId &&
                  edge.targetHandle === inputHandleId) ||
                (edge.source === inputNodeId &&
                  edge.sourceHandle === inputHandleId)
              )
          );
        }

        return addEdge(
          newEdge,
          filteredEdges.map((edge) => ({ ...edge, zIndex: 0 }))
        );
      });
    },
    [setEdges, isValidConnection, disabled, createObjectUrl, nodes]
  );

  // Node management
  const handleAddNode = useCallback(() => {
    if (disabled) return;
    setIsNodeSelectorOpen(true);
  }, [disabled]);

  const handleNodeSelect = useCallback(
    (nodeType: NodeType) => {
      if (!reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const newNode: ReactFlowNode<WorkflowNodeType> = {
        id: `${nodeType.type}-${Date.now()}`,
        type: "workflowNode",
        position,
        selected: true,
        data: {
          name: nodeType.name,
          inputs: nodeType.inputs.map((param) => ({
            ...param,
            id: param.name,
          })),
          outputs: nodeType.outputs.map((param) => ({
            ...param,
            id: param.name,
          })),
          executionState: "idle" as NodeExecutionState,
          nodeType: nodeType.type,
          icon: nodeType.icon,
          functionCalling: nodeType.functionCalling,
          asTool: nodeType.asTool,
          createObjectUrl,
        },
      };

      setNodes((nds) => [
        ...nds.map((node) => ({ ...node, selected: false })),
        newNode,
      ]);
    },
    [reactFlowInstance, setNodes, createObjectUrl]
  );

  // Update node execution data
  const updateNodeExecution = useCallback(
    (nodeId: string, update: NodeExecutionUpdate) => {
      const { state, outputs, error } = update;

      setNodes((nds) => {
        let updatedNodes = nds;

        if (state !== undefined) {
          updatedNodes = updateNodesWithExecutionState(
            updatedNodes,
            nodeId,
            state
          );
        }

        if (outputs !== undefined) {
          updatedNodes = updateNodesWithExecutionOutputs(
            updatedNodes,
            nodeId,
            outputs
          );
        }

        if (error !== undefined) {
          updatedNodes = updateNodesWithExecutionError(
            updatedNodes,
            nodeId,
            error
          );
        }

        return [...updatedNodes];
      });

      if (state !== undefined) {
        const nodeEdges = getConnectedEdges(
          [{ id: nodeId } as ReactFlowNode<WorkflowNodeType>],
          edges
        );
        const connectedEdgeIds = nodeEdges.map((edge) => edge.id);

        setEdges((eds) => [
          ...updateEdgesForNodeExecution(eds, state, connectedEdgeIds),
        ]);
      }
    },
    [edges, setNodes, setEdges]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<WorkflowNodeType>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...data,
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  const updateEdgeData = useCallback(
    (edgeId: string, data: Partial<WorkflowEdgeType>) => {
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  ...data,
                },
              }
            : edge
        )
      );
    },
    [setEdges]
  );

  // Delete nodes and their connected edges
  const deleteNodes = useCallback(
    (nodeIds: string[]) => {
      if (disabled || nodeIds.length === 0) return;

      const nodesToDelete = nodes.filter((n) => nodeIds.includes(n.id));
      if (nodesToDelete.length === 0) return;

      const nodeEdges = getConnectedEdges(nodesToDelete, edgesRef.current);
      const edgeIdsToRemove = nodeEdges.map((edge) => edge.id);

      if (edgeIdsToRemove.length > 0) {
        setEdges((eds) =>
          eds.filter((edge) => !edgeIdsToRemove.includes(edge.id))
        );
      }

      setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));
    },
    [disabled, nodes, setEdges, setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => deleteNodes([nodeId]),
    [deleteNodes]
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      if (disabled) return;
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    },
    [disabled, setEdges]
  );

  const deleteSelected = useCallback(() => {
    if (disabled) return;

    if (selectedNodes.length > 0) {
      deleteNodes(selectedNodes.map((n) => n.id));
    } else if (selectedEdges.length > 0) {
      const edgeIds = selectedEdges.map((e) => e.id);
      setEdges((eds) => eds.filter((edge) => !edgeIds.includes(edge.id)));
    }
  }, [disabled, selectedNodes, selectedEdges, deleteNodes, setEdges]);

  const deselectAll = useCallback(() => {
    setNodes((nds) => nds.map((node) => ({ ...node, selected: false })));
    setEdges((eds) => eds.map((edge) => ({ ...edge, selected: false })));
  }, [setNodes, setEdges]);

  return {
    nodes,
    edges,
    selectedNodes,
    selectedEdges,
    reactFlowInstance,
    isNodeSelectorOpen,
    connectionValidationState,
    setNodes,
    setEdges,
    setIsNodeSelectorOpen,
    setReactFlowInstance,
    nodesRef,
    edgesRef,
    onNodesChange: handleNodesChangeInternal,
    onEdgesChange: disabled ? NOOP : onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onNodeDragStop: NOOP,
    isValidConnection,
    handleAddNode,
    handleNodeSelect,
    updateNodeExecution,
    updateNodeData,
    updateEdgeData: disabled ? NOOP : updateEdgeData,
    deleteNode: disabled ? NOOP : deleteNode,
    deleteEdge: disabled ? NOOP : deleteEdge,
    deleteSelected: disabled ? NOOP : deleteSelected,
    deselectAll,
  };
}
