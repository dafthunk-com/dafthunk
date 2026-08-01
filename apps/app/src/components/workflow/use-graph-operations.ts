import type { ObjectReference, WorkflowTrigger } from "@dafthunk/types";
import type {
  Connection,
  IsValidConnection,
  NodeChange,
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
  addEdge,
  getConnectedEdges,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createEdgeId, createNodeId } from "./graph-ids";
import {
  mergeRemoteNodes,
  serializeEdges,
  serializeNodes,
} from "./graph-projection";
import {
  ALL_TRIGGER_NODE_TYPE_IDS,
  getTriggerNodeTypes,
} from "./trigger-node-mapping";
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

/**
 * Apply a batch of execution updates in one pass over the node array.
 *
 * A running workflow reports every node on each progress frame, so applying
 * updates one at a time rewrote the whole array once per node.
 *
 * Field semantics, preserved from the per-node version this replaces:
 * - `state` also resets `error`, unless the new state is itself "error"
 * - `outputs` and `error` are only touched when the update carries them
 */
export function applyExecutionUpdates(
  nodes: ReactFlowNode<WorkflowNodeType>[],
  updates: NodeExecutionUpdate[]
): ReactFlowNode<WorkflowNodeType>[] {
  if (updates.length === 0) return nodes;

  const updatesByNodeId = new Map(
    updates.map((update) => [update.nodeId, update])
  );

  return nodes.map((node) => {
    const update = updatesByNodeId.get(node.id);
    if (!update) return node;

    const data = { ...node.data };

    if (update.state !== undefined) {
      data.executionState = update.state;
      data.error = update.state === "error" ? node.data.error : null;
    }

    if (update.outputs !== undefined) {
      const outputs = update.outputs;
      data.outputs = node.data.outputs.map(
        (output) =>
          ({
            ...output,
            value: outputs[output.id] ?? outputs[output.name],
          }) as WorkflowParameter
      );
    }

    if (update.error !== undefined) {
      data.error = update.error;
    }

    return { ...node, data };
  });
}

/**
 * Edge highlighting is a pure function of node execution state: an edge is
 * active while either endpoint is executing. Deriving it (rather than tracking
 * it alongside) means a frame that moves several nodes at once can't leave a
 * stale highlight behind.
 *
 * Returns the original array when nothing changed, so the caller's setState
 * bails out instead of re-rendering.
 */
export function updateEdgesForExecution(
  edges: ReactFlowEdge<WorkflowEdgeType>[],
  nodes: ReactFlowNode<WorkflowNodeType>[]
): ReactFlowEdge<WorkflowEdgeType>[] {
  const executingNodeIds = new Set(
    nodes
      .filter((node) => node.data.executionState === "executing")
      .map((node) => node.id)
  );

  let changed = false;
  const next = edges.map((edge) => {
    const isActive =
      executingNodeIds.has(edge.source) || executingNodeIds.has(edge.target);
    if ((edge.data?.isActive ?? false) === isActive) return edge;
    changed = true;
    return { ...edge, data: { ...(edge.data || {}), isActive } };
  });

  return changed ? next : edges;
}

function createReactFlowNode(
  nodeType: NodeType,
  position: { x: number; y: number },
  createObjectUrl: (objectReference: ObjectReference) => string
): ReactFlowNode<WorkflowNodeType> {
  return {
    id: createNodeId(nodeType.type),
    type: "workflowNode",
    position,
    selected: false,
    data: {
      name: nodeType.name,
      inputs: nodeType.inputs.map((param) => ({ ...param, id: param.name })),
      outputs: nodeType.outputs.map((param) => ({ ...param, id: param.name })),
      executionState: "idle" as NodeExecutionState,
      nodeType: nodeType.type,
      icon: nodeType.icon,
      functionCalling: nodeType.functionCalling,
      asTool: nodeType.asTool,
      metadata: nodeType.metadata ? { ...nodeType.metadata } : undefined,
      createObjectUrl,
    },
  };
}

// --- Hook interface ---

export interface UseGraphOperationsProps {
  initialNodes?: ReactFlowNode<WorkflowNodeType>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeType>[];
  validateConnection?: (connection: Connection) => boolean;
  createObjectUrl: (objectReference: ObjectReference) => string;
  disabled?: boolean;
  nodeTypes?: NodeType[];
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
  onNodeDragStart: () => void;
  onNodeDragStop: OnNodeDrag<ReactFlowNode<WorkflowNodeType>>;
  isDraggingRef: React.RefObject<boolean>;
  isValidConnection: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;

  // Actions
  handleAddNode: () => void;
  handleNodeSelect: (template: NodeType) => void;
  applyNodeExecutions: (updates: NodeExecutionUpdate[]) => void;
  updateNodeData: (
    nodeId: string,
    data:
      | Partial<WorkflowNodeType>
      | ((current: WorkflowNodeType) => Partial<WorkflowNodeType>)
  ) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  deleteSelected: () => void;
  deselectAll: () => void;
  addTriggerNodes: (trigger: WorkflowTrigger) => void;
  removeTriggerNodes: () => void;
}

const NOOP = () => {};

export function useGraphOperations({
  initialNodes = [],
  initialEdges = [],
  validateConnection = () => true,
  createObjectUrl,
  disabled = false,
  nodeTypes = [],
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
  const isDraggingRef = useRef(false);

  // Memoized: these are passed to the canvas and to the keyboard-shortcut
  // effect, which would otherwise re-subscribe on every single render.
  const selectedNodes = useMemo(
    () => nodes.filter((node) => node.selected),
    [nodes]
  );
  const selectedEdges = useMemo(
    () => edges.filter((edge) => edge.selected),
    [edges]
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Sync nodes pushed from the server.
  //
  // A remote push only carries the persisted graph — it has no execution
  // results, and no notion of what is selected or being dragged. Replacing
  // wholesale would therefore wipe the outputs and error badges of a run that
  // is still on screen. So: compare on the persistable projection only, and
  // carry the session-local state across the merge.
  useEffect(() => {
    if (!disabled && initialNodes.length === 0 && nodesRef.current.length > 0) {
      return;
    }

    const merged = mergeRemoteNodes(
      initialNodes,
      nodesRef.current,
      createObjectUrl
    );

    const graphChanged =
      serializeNodes(merged) !== serializeNodes(nodesRef.current);

    // Nodes restored from a source that couldn't carry the callback (it isn't
    // serializable) need it re-injected even when the graph itself matches.
    const anyCurrentNodeMissingFunction =
      merged.length > 0 &&
      nodesRef.current.some(
        (n) => typeof n.data.createObjectUrl !== "function"
      );

    if (graphChanged || anyCurrentNodeMissingFunction) {
      setNodes(merged);
    }
  }, [initialNodes, disabled, setNodes, createObjectUrl, nodesRef]);

  // Sync edges pushed from the server, preserving local selection.
  useEffect(() => {
    if (!disabled && initialEdges.length === 0 && edgesRef.current.length > 0) {
      return;
    }
    if (serializeEdges(initialEdges) === serializeEdges(edgesRef.current)) {
      return;
    }

    const selectedIds = new Set(
      edgesRef.current.filter((e) => e.selected).map((e) => e.id)
    );
    setEdges(
      initialEdges.map((edge) =>
        selectedIds.has(edge.id) ? { ...edge, selected: true } : edge
      )
    );
  }, [initialEdges, disabled, setEdges, edgesRef]);

  // In disabled mode, only allow selection changes.
  // Always prevent removal of trigger nodes (use trigger type selector instead).
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

      const filtered = changes.filter((change) => {
        if (change.type !== "remove") return true;
        const node = nodesRef.current.find((n) => n.id === change.id);
        return !(
          node?.data.nodeType &&
          ALL_TRIGGER_NODE_TYPE_IDS.has(node.data.nodeType)
        );
      });

      if (filtered.length > 0) {
        onNodesChange(filtered);
      }
    },
    [onNodesChange, disabled, nodesRef]
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
          "video",
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
        id: createEdgeId(
          connection.source,
          connection.sourceHandle,
          connection.target,
          connection.targetHandle
        ),
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

      const newNode = createReactFlowNode(nodeType, position, createObjectUrl);
      newNode.selected = true;

      setNodes((nds) => [
        ...nds.map((node) => ({ ...node, selected: false })),
        newNode,
      ]);
    },
    [reactFlowInstance, setNodes, createObjectUrl]
  );

  // Apply a whole progress frame in a single commit.
  const applyNodeExecutions = useCallback(
    (updates: NodeExecutionUpdate[]) => {
      if (updates.length === 0) return;
      setNodes((nds) => applyExecutionUpdates(nds, updates));
    },
    [setNodes]
  );

  // Edge highlighting follows node execution state. Kept as a derivation so
  // it cannot drift; `updateEdgesForExecution` returns the same array when
  // nothing changed, so this settles immediately instead of looping.
  useEffect(() => {
    setEdges((eds) => updateEdgesForExecution(eds, nodes));
  }, [nodes, setEdges]);

  const updateNodeData = useCallback(
    (
      nodeId: string,
      dataOrFn:
        | Partial<WorkflowNodeType>
        | ((current: WorkflowNodeType) => Partial<WorkflowNodeType>)
    ) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== nodeId) return node;
          const update =
            typeof dataOrFn === "function" ? dataOrFn(node.data) : dataOrFn;
          return {
            ...node,
            data: {
              ...node.data,
              ...update,
            },
          };
        })
      );
    },
    [setNodes]
  );

  const updateEdgeData = useCallback(
    (edgeId: string, data: Partial<WorkflowEdgeType>) => {
      if (disabled) return;
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
    [disabled, setEdges]
  );

  // Delete nodes and their connected edges (trigger nodes are protected)
  const deleteNodes = useCallback(
    (nodeIds: string[]) => {
      if (disabled || nodeIds.length === 0) return;

      const nodesToDelete = nodesRef.current.filter(
        (n) =>
          nodeIds.includes(n.id) &&
          !(n.data.nodeType && ALL_TRIGGER_NODE_TYPE_IDS.has(n.data.nodeType))
      );
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
    [disabled, nodesRef, setEdges, setNodes]
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

  const removeTriggerNodes = useCallback(() => {
    if (disabled) return;
    const triggerNodes = nodesRef.current.filter(
      (n) => n.data.nodeType && ALL_TRIGGER_NODE_TYPE_IDS.has(n.data.nodeType)
    );
    if (triggerNodes.length === 0) return;

    const triggerNodeIds = new Set(triggerNodes.map((n) => n.id));
    const edgeIdsToRemove = getConnectedEdges(
      triggerNodes,
      edgesRef.current
    ).map((e) => e.id);

    if (edgeIdsToRemove.length > 0) {
      setEdges((eds) => eds.filter((e) => !edgeIdsToRemove.includes(e.id)));
    }
    setNodes((nds) => nds.filter((n) => !triggerNodeIds.has(n.id)));
  }, [disabled, nodesRef, edgesRef, setNodes, setEdges]);

  const addTriggerNodes = useCallback(
    (trigger: WorkflowTrigger) => {
      if (disabled) return;
      const nodeTypeIds = getTriggerNodeTypes(trigger);
      if (nodeTypeIds.length === 0) return;

      const newNodes = nodeTypeIds.flatMap((nodeTypeId, i) => {
        const nodeType = nodeTypes.find((nt) => nt.type === nodeTypeId);
        if (!nodeType) return [];
        return createReactFlowNode(
          nodeType,
          { x: i * 400, y: 0 },
          createObjectUrl
        );
      });

      if (newNodes.length > 0) {
        setNodes((nds) => [...nds, ...newNodes]);
      }
    },
    [disabled, nodeTypes, setNodes, createObjectUrl]
  );

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
    onNodeDragStart: useCallback(() => {
      isDraggingRef.current = true;
    }, []),
    onNodeDragStop: useCallback(() => {
      isDraggingRef.current = false;
      setNodes((nodes) => [...nodes]);
    }, [setNodes]),
    isDraggingRef,
    isValidConnection,
    handleAddNode,
    handleNodeSelect,
    // Every mutating operation above enforces `disabled` itself, so there is
    // no second gate here. The deliberate exceptions are `applyNodeExecutions`,
    // `updateNodeData` and `deselectAll`: read-only views (execution details,
    // template previews) still need to paint execution results onto the graph.
    applyNodeExecutions,
    updateNodeData,
    updateEdgeData,
    deleteNode,
    deleteEdge,
    deleteSelected,
    deselectAll,
    addTriggerNodes,
    removeTriggerNodes,
  };
}
