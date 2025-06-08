import type { ObjectReference } from "@dafthunk/types";
import dagre from "@dagrejs/dagre";
import {
  addEdge,
  Connection,
  Edge as ReactFlowEdge,
  getConnectedEdges,
  IsValidConnection,
  Node as ReactFlowNode,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ConnectionValidationState,
  NodeExecutionState,
  NodeTemplate,
  WorkflowEdgeType,
  WorkflowNodeType,
} from "./workflow-types";

interface UseWorkflowStateProps {
  initialNodes?: ReactFlowNode<WorkflowNodeType>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeType>[];
  onNodesChangePersist?: (nodes: ReactFlowNode<WorkflowNodeType>[]) => void;
  onEdgesChangePersist?: (edges: ReactFlowEdge<WorkflowEdgeType>[]) => void;
  validateConnection?: (connection: Connection) => boolean;
  createObjectUrl: (objectReference: ObjectReference) => string;
  readonly?: boolean;
}

type NodeExecutionUpdate = {
  state?: NodeExecutionState;
  outputs?: Record<string, any>;
  error?: string;
};

interface UseWorkflowStateReturn {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  selectedNode: ReactFlowNode<WorkflowNodeType> | null;
  selectedEdge: ReactFlowEdge<WorkflowEdgeType> | null;
  reactFlowInstance: ReactFlowInstance<
    ReactFlowNode<WorkflowNodeType>,
    ReactFlowEdge<WorkflowEdgeType>
  > | null;
  isNodeSelectorOpen: boolean;
  setIsNodeSelectorOpen: (open: boolean) => void;
  onNodesChange: OnNodesChange<ReactFlowNode<WorkflowNodeType>>;
  onEdgesChange: OnEdgesChange<ReactFlowEdge<WorkflowEdgeType>>;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  connectionValidationState: ConnectionValidationState;
  isValidConnection: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;
  handleNodeClick: (
    event: React.MouseEvent,
    node: ReactFlowNode<WorkflowNodeType>
  ) => void;
  handleEdgeClick: (
    event: React.MouseEvent,
    edge: ReactFlowEdge<WorkflowEdgeType>
  ) => void;
  handlePaneClick: () => void;
  handleAddNode: () => void;
  handleNodeSelect: (template: NodeTemplate) => void;
  setReactFlowInstance: (
    instance: ReactFlowInstance<
      ReactFlowNode<WorkflowNodeType>,
      ReactFlowEdge<WorkflowEdgeType>
    > | null
  ) => void;
  updateNodeExecution: (nodeId: string, update: NodeExecutionUpdate) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  deleteSelectedElement: () => void;
  isEditNodeNameDialogOpen: boolean;
  toggleEditNodeNameDialog: (open?: boolean) => void;
  applyLayout: () => void;
}

// Helper functions to replace workflowNodeStateService
const stripExecutionFields = (
  data: WorkflowNodeType
): Omit<WorkflowNodeType, "executionState" | "error"> & {
  outputs: Omit<WorkflowNodeType["outputs"][number], "value" | "isConnected">[];
  inputs: Omit<WorkflowNodeType["inputs"][number], "isConnected">[];
} => {
  const { executionState, error, ...rest } = data;

  return {
    ...rest,
    outputs: data.outputs.map(
      ({ value, isConnected, ...outputRest }) => outputRest
    ),
    inputs: data.inputs.map(({ isConnected, ...inputRest }) => inputRest),
  };
};

const stripEdgeExecutionFields = (
  data: WorkflowEdgeType = {}
): Omit<WorkflowEdgeType, "isActive"> => {
  const { isActive, ...rest } = data;
  return rest;
};

const updateNodesWithExecutionState = (
  nodes: ReactFlowNode<WorkflowNodeType>[],
  nodeId: string,
  state: NodeExecutionState
): ReactFlowNode<WorkflowNodeType>[] => {
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
};

const updateEdgesForNodeExecution = (
  edges: ReactFlowEdge<WorkflowEdgeType>[],
  _nodeId: string,
  state: NodeExecutionState,
  connectedEdgeIds: string[]
): ReactFlowEdge<WorkflowEdgeType>[] => {
  if (state === "executing") {
    return edges.map((edge) => {
      const isConnectedToExecutingNode = connectedEdgeIds.includes(edge.id);
      return {
        ...edge,
        data: {
          ...(edge.data || {}),
          isActive: isConnectedToExecutingNode,
        },
      };
    });
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
};

const updateNodesWithExecutionOutputs = (
  nodes: ReactFlowNode<WorkflowNodeType>[],
  nodeId: string,
  outputs: Record<string, unknown>
): ReactFlowNode<WorkflowNodeType>[] => {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          data: {
            ...node.data,
            outputs: node.data.outputs.map((output) => ({
              ...output,
              value: outputs[output.id],
            })),
          },
        }
      : node
  );
};

const updateNodesWithExecutionError = (
  nodes: ReactFlowNode<WorkflowNodeType>[],
  nodeId: string,
  error: string | undefined
): ReactFlowNode<WorkflowNodeType>[] => {
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
};

export function useWorkflowState({
  initialNodes = [],
  initialEdges = [],
  onNodesChangePersist: onNodesChangePersistCallback,
  onEdgesChangePersist: onEdgesChangePersistCallback,
  validateConnection = () => true,
  createObjectUrl,
  readonly = false,
}: UseWorkflowStateProps): UseWorkflowStateReturn {
  // State management
  const [nodes, setNodes, onNodesChange] =
    useNodesState<ReactFlowNode<WorkflowNodeType>>(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<ReactFlowEdge<WorkflowEdgeType>>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    ReactFlowNode<WorkflowNodeType>,
    ReactFlowEdge<WorkflowEdgeType>
  > | null>(null);
  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [connectionValidationState, setConnectionValidationState] =
    useState<ConnectionValidationState>("default");
  const [isEditNodeNameDialogOpen, setIsEditNodeNameDialogOpen] =
    useState(false);

  const nodesRef = useRef(initialNodes);
  const edgesRef = useRef(initialEdges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Effect to update nodes when initialNodes prop changes
  useEffect(() => {
    // Ensure all nodes derived from the initialNodes prop have createObjectUrl in their data
    const newNodesWithCreateObjectUrl = initialNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        createObjectUrl: createObjectUrl,
      },
    }));

    // Condition from original code to prevent wiping an unsaved workflow
    // when initialNodes is empty but there are already nodes in the editor.
    if (!readonly && initialNodes.length === 0 && nodesRef.current.length > 0) {
      // Do nothing, preserve current nodes.
      // This handles the case where initialNodes might be an empty array during
      // initial loading before actual workflow data is fetched.
      return;
    }

    // Determine if an update to the nodes state is actually needed.
    // We check for two conditions:
    // 1. Structural difference: The data part of the nodes (excluding the createObjectUrl function itself for comparison)
    //    has changed between the new processed initial nodes and the current nodes in state.
    // 2. Missing function: Any current node in state is missing the createObjectUrl function
    //    when the initialNodes (and thus newNodesWithCreateObjectUrl) expect it to be there.

    const newNodesStrippedForCompare = newNodesWithCreateObjectUrl.map((n) => ({
      ...n,
      position: n.position,
      data: { ...n.data, createObjectUrl: undefined },
    }));
    const currentNodesStrippedForCompare = nodes.map((n) => ({
      ...n,
      position: n.position,
      data: { ...n.data, createObjectUrl: undefined },
    }));

    const newNodesStructurallyDifferent =
      JSON.stringify(newNodesStrippedForCompare) !==
      JSON.stringify(currentNodesStrippedForCompare);

    // Check if any current node is missing the function, but only if newNodesWithCreateObjectUrl is not empty
    // (i.e., we expect nodes to exist and have the function).
    const anyCurrentNodeMissingFunction =
      newNodesWithCreateObjectUrl.length > 0 &&
      nodes.some((n) => typeof n.data.createObjectUrl !== "function");

    if (newNodesStructurallyDifferent || anyCurrentNodeMissingFunction) {
      setNodes(newNodesWithCreateObjectUrl);
    }
  }, [initialNodes, readonly, setNodes, createObjectUrl]);

  // Effect to update edges when initialEdges prop changes
  useEffect(() => {
    // Similar to nodes, prevent resetting edges unnecessarily.
    if (!readonly && initialEdges.length === 0 && edgesRef.current.length > 0) {
      // Allow resetting for deliberate empty array.
    } else {
      if (JSON.stringify(edgesRef.current) !== JSON.stringify(initialEdges)) {
        setEdges(initialEdges);
      }
    }
  }, [initialEdges, readonly, setEdges]); // Removed edges, relying on edgesRef.current

  // Effect to notify parent of changes for nodes
  useEffect(() => {
    if (readonly) return;

    const nodeCountChanged = nodes.length !== initialNodes.length;
    const hasDataOrPositionChanges = nodes.some((node) => {
      const initialNode = initialNodes.find((n) => n.id === node.id);
      if (!initialNode) return true;

      if (
        node.position.x !== initialNode.position.x ||
        node.position.y !== initialNode.position.y
      ) {
        return true;
      }

      const nodeData = stripExecutionFields(node.data);
      const initialNodeData = stripExecutionFields(initialNode.data);
      return JSON.stringify(nodeData) !== JSON.stringify(initialNodeData);
    });

    // Check for deleted nodes by looking for initialNodes that don't exist in the current nodes
    const hasDeletedNodes = initialNodes.some(
      (initialNode) => !nodes.some((node) => node.id === initialNode.id)
    );

    if (nodeCountChanged || hasDataOrPositionChanges || hasDeletedNodes) {
      onNodesChangePersistCallback?.(nodes);
    }
  }, [nodes, onNodesChangePersistCallback, initialNodes, readonly]);

  // Effect to notify parent of changes for edges
  useEffect(() => {
    if (readonly) return;

    const hasNonExecutionChanges = edges.some((edge) => {
      const initialEdge = initialEdges.find((e) => e.id === edge.id);
      if (!initialEdge) return true;

      if (
        edge.source !== initialEdge.source ||
        edge.target !== initialEdge.target ||
        edge.sourceHandle !== initialEdge.sourceHandle ||
        edge.targetHandle !== initialEdge.targetHandle
      )
        return true;

      const edgeData = stripEdgeExecutionFields(edge.data);
      const initialEdgeData = stripEdgeExecutionFields(initialEdge.data);

      return JSON.stringify(edgeData) !== JSON.stringify(initialEdgeData);
    });

    // Check for deleted edges by looking for initialEdges that don't exist in the current edges
    const hasDeletedEdges = initialEdges.some(
      (initialEdge) => !edges.some((edge) => edge.id === initialEdge.id)
    );

    if (hasNonExecutionChanges || hasDeletedEdges) {
      onEdgesChangePersistCallback?.(edges);
    }
  }, [edges, onEdgesChangePersistCallback, initialEdges, readonly]);

  // Effect to keep selectedNode in sync with nodes state
  useEffect(() => {
    if (selectedNode) {
      const updatedNodeInCurrentNodes = nodes.find(
        (node) => node.id === selectedNode.id
      );
      if (updatedNodeInCurrentNodes) {
        // Node still exists, check if its data has changed compared to our selectedNode state
        if (
          JSON.stringify(updatedNodeInCurrentNodes) !==
          JSON.stringify(selectedNode)
        ) {
          setSelectedNode(updatedNodeInCurrentNodes);
        }
      } else {
        // Node with selectedNode.id no longer exists in the nodes array
        setSelectedNode(null);
      }
    }
  }, [nodes, selectedNode]);

  // Custom onNodesChange handler for readonly mode
  const handleNodesChangeInternal = useCallback(
    (changes: any) => {
      if (readonly) {
        const filteredChanges = changes.filter(
          (change: any) => change.type !== "position"
        );
        if (filteredChanges.length > 0) {
          onNodesChange(filteredChanges);
        }
        // If there are only non-selection changes, we effectively ignore them.
      } else {
        onNodesChange(changes);
      }
    },
    [onNodesChange, readonly]
  );

  // Handle node selection
  const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    event.stopPropagation();
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: any) => {
      event.stopPropagation();
      setSelectedEdge(edge);
      setSelectedNode(null);

      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          zIndex: e.id === edge.id ? 1000 : 0,
        }))
      );
    },
    [setEdges]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);

    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        zIndex: 0,
      }))
    );
  }, [setEdges]);

  // Connection event handlers
  const onConnectStart = useCallback(() => {
    if (readonly) return;
    setConnectionValidationState("default");
  }, [readonly]);

  const onConnectEnd = useCallback(() => {
    if (readonly) return;
    setConnectionValidationState("default");
  }, [readonly]);

  // Function to validate connection based on type compatibility
  const isValidConnection = useCallback(
    (connection: any) => {
      if (readonly) return false;
      if (!connection.source || !connection.target) return false;

      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      const sourceOutput = sourceNode.data.outputs.find(
        (output) => output.id === connection.sourceHandle
      );
      const targetInput = targetNode.data.inputs.find(
        (input) => input.id === connection.targetHandle
      );
      if (!sourceOutput || !targetInput) return false;

      const typesMatch =
        sourceOutput.type === targetInput.type ||
        sourceOutput.type === "any" ||
        targetInput.type === "any";

      setConnectionValidationState(typesMatch ? "valid" : "invalid");
      return typesMatch && validateConnection(connection);
    },
    [nodes, validateConnection, readonly]
  );

  // Handle connection
  const onConnect = useCallback(
    (connection: any) => {
      if (readonly) return;
      if (!connection.source || !connection.target) return;
      if (!isValidConnection(connection)) return;

      const newEdge = {
        ...connection,
        id: `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
        type: "workflowEdge",
        data: {
          isValid: true,
          isActive: false,
          sourceType: connection.sourceHandle,
          targetType: connection.targetHandle,
          createObjectUrl,
        },
        zIndex: 0,
      };

      setEdges((eds) => {
        // Remove existing edges with same target input
        const filteredEdges = eds.filter(
          (edge) =>
            !(
              edge.target === connection.target &&
              edge.targetHandle === connection.targetHandle
            )
        );

        // Reset all z-indices and add new edge
        const updatedEdges = filteredEdges.map((edge) => ({
          ...edge,
          zIndex: 0,
        }));

        return addEdge(newEdge, updatedEdges);
      });
    },
    [setEdges, isValidConnection, readonly, createObjectUrl]
  );

  // Node management
  const handleAddNode = useCallback(() => {
    if (readonly) return;
    setIsNodeSelectorOpen(true);
  }, [readonly]);

  const handleNodeSelect = useCallback(
    (template: NodeTemplate) => {
      if (!reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const newNode: ReactFlowNode<WorkflowNodeType> = {
        id: `${template.type}-${Date.now()}`,
        type: "workflowNode",
        position,
        data: {
          name: template.name,
          inputs: template.inputs,
          outputs: template.outputs,
          executionState: "idle" as NodeExecutionState,
          nodeType: template.type,
          createObjectUrl,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, createObjectUrl]
  );

  // Unified function to update node execution data
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
        const nodeEdges = getConnectedEdges([{ id: nodeId } as any], edges);
        const connectedEdgeIds = nodeEdges.map((edge) => edge.id);

        setEdges((eds) => [
          ...updateEdgesForNodeExecution(eds, nodeId, state, connectedEdgeIds),
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

  // Delete node and its connected edges
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (readonly) return;
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) return;

      const nodeEdges = getConnectedEdges([nodeToDelete], edgesRef.current);
      const edgeIdsToRemove = nodeEdges.map((edge) => edge.id);

      if (edgeIdsToRemove.length > 0) {
        setEdges((eds) =>
          eds.filter((edge) => !edgeIdsToRemove.includes(edge.id))
        );
      }

      setNodes((nds) => nds.filter((node) => node.id !== nodeId));

      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [readonly, nodes, selectedNode, setEdges, setNodes]
  );

  // Delete edge
  const deleteEdge = useCallback(
    (edgeId: string) => {
      if (readonly) return;
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
      if (selectedEdge?.id === edgeId) {
        setSelectedEdge(null);
      }
    },
    [readonly, selectedEdge, setEdges]
  );

  // Delete selected element (node or edge)
  const deleteSelectedElement = useCallback(() => {
    if (readonly) return;
    if (selectedNode) {
      deleteNode(selectedNode.id);
    } else if (selectedEdge) {
      deleteEdge(selectedEdge.id);
    }
  }, [readonly, selectedNode, selectedEdge, deleteNode, deleteEdge]);

  const toggleEditNodeNameDialog = useCallback(
    (open?: boolean) => {
      if (readonly) return;
      setIsEditNodeNameDialogOpen((prev) =>
        open === undefined ? !prev : open
      );
    },
    [readonly]
  );

  const applyLayout = useCallback(() => {
    if (readonly) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "LR", nodesep: 100, ranksep: 100 });

    nodesRef.current.forEach((node) => {
      // Ensure width and height are available, provide defaults if not
      const nodeWidth = node.width || 200; // Default width
      const nodeHeight = node.height || 100; // Default height
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edgesRef.current.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    setNodes((nds) =>
      nds.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        // Adjust position to be an offset from the current viewport center
        // This can help prevent nodes from flying too far off screen
        const x = nodeWithPosition.x - (node.width || 200) / 2;
        const y = nodeWithPosition.y - (node.height || 100) / 2;

        return {
          ...node,
          position: { x, y },
        };
      })
    );
    reactFlowInstance?.fitView();
  }, [setNodes, readonly, reactFlowInstance]);

  return {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    reactFlowInstance,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
    onNodesChange: handleNodesChangeInternal,
    onEdgesChange: readonly ? () => {} : onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    connectionValidationState,
    isValidConnection,
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleAddNode,
    handleNodeSelect,
    setReactFlowInstance,
    updateNodeExecution,
    updateNodeData: readonly ? () => {} : updateNodeData,
    updateEdgeData: readonly ? () => {} : updateEdgeData,
    deleteNode: readonly ? () => {} : deleteNode,
    deleteEdge: readonly ? () => {} : deleteEdge,
    deleteSelectedElement: readonly ? () => {} : deleteSelectedElement,
    isEditNodeNameDialogOpen,
    toggleEditNodeNameDialog,
    applyLayout,
  };
}
