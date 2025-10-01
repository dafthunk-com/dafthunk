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
  nodeTemplates?: NodeTemplate[];
}

type NodeExecutionUpdate = {
  state?: NodeExecutionState;
  outputs?: Record<string, any>;
  error?: string;
};

interface ClipboardData {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  isCut: boolean;
}

interface UseWorkflowStateReturn {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  selectedNodes: ReactFlowNode<WorkflowNodeType>[];
  selectedEdges: ReactFlowEdge<WorkflowEdgeType>[];
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
  onNodeDragStop: (
    event: React.MouseEvent,
    node: ReactFlowNode<WorkflowNodeType>
  ) => void;
  connectionValidationState: ConnectionValidationState;
  isValidConnection: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;
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
  deleteSelected: () => void;
  duplicateNode: (nodeId: string) => void;
  duplicateSelected: () => void;
  isEditNodeNameDialogOpen: boolean;
  toggleEditNodeNameDialog: (open?: boolean) => void;
  applyLayout: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteFromClipboard: () => void;
  hasClipboardData: boolean;
}

// Helper functions to replace workflowNodeStateService
const stripExecutionFields = (
  data: WorkflowNodeType
): Omit<WorkflowNodeType, "executionState" | "error" | "nodeTemplates"> & {
  outputs: Omit<WorkflowNodeType["outputs"][number], "value" | "isConnected">[];
  inputs: Omit<WorkflowNodeType["inputs"][number], "isConnected">[];
} => {
  // Exclude nodeTemplates from comparison - it's UI metadata that shouldn't trigger persistence
  const { executionState, error, nodeTemplates, ...rest } = data;

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
  nodeTemplates = [],
}: UseWorkflowStateProps): UseWorkflowStateReturn {
  // State management
  const [nodes, setNodes, onNodesChange] = useNodesState<
    ReactFlowNode<WorkflowNodeType>
  >(
    initialNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        nodeTemplates,
      },
    }))
  );
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<ReactFlowEdge<WorkflowEdgeType>>(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    ReactFlowNode<WorkflowNodeType>,
    ReactFlowEdge<WorkflowEdgeType>
  > | null>(null);

  // Update nodes when nodeTemplates changes
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          nodeTemplates,
        },
      }))
    );
  }, [nodeTemplates, setNodes]);
  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [connectionValidationState, setConnectionValidationState] =
    useState<ConnectionValidationState>("default");
  const [isEditNodeNameDialogOpen, setIsEditNodeNameDialogOpen] =
    useState(false);
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(
    null
  );

  const nodesRef = useRef(initialNodes);
  const edgesRef = useRef(initialEdges);

  // Get selected nodes and edges directly from the arrays
  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedEdges = edges.filter((edge) => edge.selected);

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
    const currentNodesStrippedForCompare = nodesRef.current.map((n) => ({
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
      nodesRef.current.some(
        (n) => typeof n.data.createObjectUrl !== "function"
      );

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
  }, [initialEdges, readonly, setEdges]);

  // Effect to notify parent of changes for nodes (excluding position changes during drag)
  useEffect(() => {
    if (readonly) return;

    const nodeCountChanged = nodes.length !== initialNodes.length;

    // Check for data changes (excluding position)
    let hasDataChanges = false;
    nodes.forEach((node) => {
      const initialNode = initialNodes.find((n) => n.id === node.id);
      if (!initialNode) {
        hasDataChanges = true;
        return;
      }

      // Check data changes (not position)
      const nodeData = stripExecutionFields(node.data);
      const initialNodeData = stripExecutionFields(initialNode.data);
      if (JSON.stringify(nodeData) !== JSON.stringify(initialNodeData)) {
        hasDataChanges = true;
      }
    });

    // Check for deleted nodes
    const hasDeletedNodes = initialNodes.some(
      (initialNode) => !nodes.some((node) => node.id === initialNode.id)
    );

    // Save for data changes or node add/delete (position changes handled by onNodeDragStop)
    if (nodeCountChanged || hasDataChanges || hasDeletedNodes) {
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

  // Custom onNodesChange handler for readonly mode
  const handleNodesChangeInternal = useCallback(
    (changes: any) => {
      if (readonly) {
        // In readonly mode, only allow selection changes and block destructive changes
        const filteredChanges = changes.filter(
          (change: any) => change.type === "select"
        );

        if (filteredChanges.length > 0) {
          onNodesChange(filteredChanges);
        }
      } else {
        onNodesChange(changes);
      }
    },
    [onNodesChange, readonly]
  );

  // Connection event handlers
  const onConnectStart = useCallback(() => {
    if (readonly) return;
    setConnectionValidationState("default");
  }, [readonly]);

  const onConnectEnd = useCallback(() => {
    if (readonly) return;
    setConnectionValidationState("default");
  }, [readonly]);

  // Handle node drag stop - save positions after drag completes
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: ReactFlowNode<WorkflowNodeType>) => {
      if (readonly) return;
      // Save with current node positions after drag completes
      onNodesChangePersistCallback?.(nodes);
    },
    [readonly, nodes, onNodesChangePersistCallback]
  );

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

      // Only check for existing connections if the input doesn't accept multiple connections
      const acceptsMultipleConnections = targetInput.repeated || false;

      if (!acceptsMultipleConnections) {
        const hasExistingConnection = edges.some(
          (edge) =>
            edge.target === connection.target &&
            edge.targetHandle === connection.targetHandle
        );
        if (hasExistingConnection) {
          setConnectionValidationState("invalid");
          return false;
        }
      }

      setConnectionValidationState(typesMatch ? "valid" : "invalid");
      return (
        typesMatch &&
        (validateConnection ? validateConnection(connection) : true)
      );
    },
    [nodes, edges, validateConnection, readonly]
  );

  // Handle connection
  const onConnect = useCallback(
    (connection: any) => {
      if (readonly) return;
      if (!connection.source || !connection.target) return;
      if (!isValidConnection(connection)) return;

      // Check if target input accepts multiple connections
      const targetNode = nodes.find((node) => node.id === connection.target);
      const targetInput = targetNode?.data.inputs.find(
        (input) => input.id === connection.targetHandle
      );
      const acceptsMultipleConnections = targetInput?.repeated || false;

      const newEdge = {
        ...connection,
        id: `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}-${Date.now()}`,
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
        let filteredEdges = eds;

        // Only remove existing edges if target input doesn't accept multiple connections
        if (!acceptsMultipleConnections) {
          filteredEdges = eds.filter(
            (edge) =>
              !(
                edge.target === connection.target &&
                edge.targetHandle === connection.targetHandle
              )
          );
        }

        // Reset all z-indices and add new edge
        const updatedEdges = filteredEdges.map((edge) => ({
          ...edge,
          zIndex: 0,
        }));

        return addEdge(newEdge, updatedEdges);
      });
    },
    [setEdges, isValidConnection, readonly, createObjectUrl, nodes]
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
          icon: template.icon,
          functionCalling: template.functionCalling,
          asTool: template.asTool,
          nodeTemplates,
          createObjectUrl,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, createObjectUrl, nodeTemplates]
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
    },
    [readonly, nodes, setEdges, setNodes]
  );

  // Delete multiple nodes and their connected edges
  const deleteNodes = useCallback(
    (nodeIds: string[]) => {
      if (readonly || nodeIds.length === 0) return;

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
    [readonly, nodes, setEdges, setNodes]
  );

  // Delete edge
  const deleteEdge = useCallback(
    (edgeId: string) => {
      if (readonly) return;
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    },
    [readonly, setEdges]
  );

  // Delete multiple edges
  const deleteEdges = useCallback(
    (edgeIds: string[]) => {
      if (readonly || edgeIds.length === 0) return;

      setEdges((eds) => eds.filter((edge) => !edgeIds.includes(edge.id)));
    },
    [readonly, setEdges]
  );

  // Duplicate node
  const duplicateNode = useCallback(
    (nodeId: string) => {
      if (readonly) return;
      const nodeToDuplicate = nodes.find((n) => n.id === nodeId);
      if (!nodeToDuplicate) return;

      // Create a new node with a unique ID and offset position
      const newNode: ReactFlowNode<WorkflowNodeType> = {
        ...nodeToDuplicate,
        id: `${nodeToDuplicate.data.nodeType || "node"}-${Date.now()}`,
        position: {
          x: nodeToDuplicate.position.x + 250, // Offset by 250px to the right
          y: nodeToDuplicate.position.y + 50, // Offset by 50px down
        },
        selected: true, // Mark the new node as selected
        data: {
          ...nodeToDuplicate.data,
          // Reset execution state for the duplicated node
          executionState: "idle" as NodeExecutionState,
          error: undefined,
          // Reset output values
          outputs: nodeToDuplicate.data.outputs.map((output) => ({
            ...output,
            value: undefined,
            isConnected: false,
          })),
          // Reset input connections
          inputs: nodeToDuplicate.data.inputs.map((input) => ({
            ...input,
            isConnected: false,
          })),
        },
      };

      // Update nodes array: add new node and deselect all others
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode,
      ]);

      // Clear edge selection
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          selected: false,
          zIndex: 0,
        }))
      );
    },
    [readonly, nodes, setNodes, setEdges]
  );

  // Delete selected elements (nodes or edges)
  const deleteSelected = useCallback(() => {
    if (readonly) return;

    if (selectedNodes.length > 0) {
      deleteNodes(selectedNodes.map((n) => n.id));
    } else if (selectedEdges.length > 0) {
      deleteEdges(selectedEdges.map((e) => e.id));
    }
  }, [readonly, selectedNodes, selectedEdges, deleteNodes, deleteEdges]);

  // Duplicate selected elements (nodes and edges)
  const duplicateSelected = useCallback(() => {
    if (readonly || (selectedNodes.length === 0 && selectedEdges.length === 0))
      return;

    if (selectedNodes.length > 0) {
      // Get edges that connect selected nodes, plus any manually selected edges
      const selectedNodeIds = selectedNodes.map((node) => node.id);
      const connectedEdges = edges.filter(
        (edge) =>
          selectedNodeIds.includes(edge.source) &&
          selectedNodeIds.includes(edge.target)
      );

      // Combine connected edges with manually selected edges (avoiding duplicates)
      const allSelectedEdges = [
        ...new Set([...connectedEdges, ...selectedEdges]),
      ];

      // Calculate duplicate position offset
      const duplicateOffset = { x: 50, y: 50 };
      const timestamp = Date.now();

      // Create ID mapping for nodes
      const nodeIdMap = new Map<string, string>();

      // Create new nodes with new IDs
      const newNodes = selectedNodes.map((node, index) => {
        const newId = `${node.data.nodeType || "node"}-${timestamp}-${index}`;
        nodeIdMap.set(node.id, newId);

        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + duplicateOffset.x,
            y: node.position.y + duplicateOffset.y,
          },
          selected: true, // Mark the new nodes as selected
          data: {
            ...node.data,
            // Reset execution state for the duplicated node
            executionState: "idle" as NodeExecutionState,
            error: undefined,
            // Reset output values
            outputs: node.data.outputs.map((output) => ({
              ...output,
              value: undefined,
              isConnected: false,
            })),
            // Reset input connections
            inputs: node.data.inputs.map((input) => ({
              ...input,
              isConnected: false,
            })),
          },
        };
      });

      // Create new edges with updated node IDs (only for edges that connect duplicated nodes)
      const newEdges = allSelectedEdges
        .filter(
          (edge) => nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target)
        )
        .map((edge) => ({
          ...edge,
          id: `${nodeIdMap.get(edge.source)}-${edge.sourceHandle}-${nodeIdMap.get(edge.target)}-${edge.targetHandle}`,
          source: nodeIdMap.get(edge.source)!,
          target: nodeIdMap.get(edge.target)!,
          selected: true, // Select duplicated edges
          data: {
            ...edge.data,
            createObjectUrl,
          },
        }));

      // Update nodes array: deselect all existing nodes and add new nodes
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        ...newNodes,
      ]);

      // Update edges array: deselect all existing edges and add new edges
      setEdges((eds) => [
        ...eds.map((e) => ({ ...e, selected: false })),
        ...newEdges,
      ]);
    }
  }, [
    readonly,
    selectedNodes,
    selectedEdges,
    edges,
    setNodes,
    setEdges,
    createObjectUrl,
  ]);

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

  // Clipboard operations
  const copySelected = useCallback(() => {
    if (readonly || (selectedNodes.length === 0 && selectedEdges.length === 0))
      return;

    // Get edges that connect selected nodes, plus any manually selected edges
    const selectedNodeIds = selectedNodes.map((node) => node.id);
    const connectedEdges = edges.filter(
      (edge) =>
        selectedNodeIds.includes(edge.source) &&
        selectedNodeIds.includes(edge.target)
    );

    // Combine connected edges with manually selected edges (avoiding duplicates)
    const allSelectedEdges = [
      ...new Set([...connectedEdges, ...selectedEdges]),
    ];

    setClipboardData({
      nodes: selectedNodes.map((node) => ({
        ...node,
        selected: false, // Don't copy selection state
      })),
      edges: allSelectedEdges.map((edge) => ({
        ...edge,
        selected: false, // Don't copy selection state
      })),
      isCut: false,
    });
  }, [readonly, selectedNodes, selectedEdges, edges]);

  const cutSelected = useCallback(() => {
    if (readonly || (selectedNodes.length === 0 && selectedEdges.length === 0))
      return;

    // Copy first, then delete
    copySelected();
    deleteSelected();

    // Mark as cut in clipboard
    setClipboardData((prev) => (prev ? { ...prev, isCut: true } : null));
  }, [readonly, selectedNodes, selectedEdges, copySelected, deleteSelected]);

  const pasteFromClipboard = useCallback(() => {
    if (readonly || !clipboardData || clipboardData.nodes.length === 0) return;

    // Calculate paste position
    const pasteOffset = { x: 50, y: 50 };

    // Create ID mapping for nodes
    const nodeIdMap = new Map<string, string>();
    const timestamp = Date.now();

    // Create new nodes with new IDs
    const newNodes = clipboardData.nodes.map((node, index) => {
      const newId = `${node.data.nodeType || "node"}-${timestamp}-${index}`;
      nodeIdMap.set(node.id, newId);

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + pasteOffset.x,
          y: node.position.y + pasteOffset.y,
        },
        selected: true, // Select pasted nodes
        data: {
          ...node.data,
          // Reset execution state for pasted nodes
          executionState: "idle" as NodeExecutionState,
          error: undefined,
          // Reset output values
          outputs: node.data.outputs.map((output) => ({
            ...output,
            value: undefined,
            isConnected: false,
          })),
          // Reset input connections
          inputs: node.data.inputs.map((input) => ({
            ...input,
            isConnected: false,
          })),
          createObjectUrl,
        },
      };
    });

    // Create new edges with updated node IDs
    const newEdges = clipboardData.edges
      .filter(
        (edge) => nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target)
      )
      .map((edge) => ({
        ...edge,
        id: `${nodeIdMap.get(edge.source)}-${edge.sourceHandle}-${nodeIdMap.get(edge.target)}-${edge.targetHandle}`,
        source: nodeIdMap.get(edge.source)!,
        target: nodeIdMap.get(edge.target)!,
        selected: true, // Select pasted edges
        data: {
          ...edge.data,
          createObjectUrl,
        },
      }));

    // Clear existing selections and add new nodes/edges
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);

    setEdges((eds) => [
      ...eds.map((e) => ({ ...e, selected: false })),
      ...newEdges,
    ]);

    // Clear clipboard if it was cut data
    if (clipboardData.isCut) {
      setClipboardData(null);
    }
  }, [readonly, clipboardData, setNodes, setEdges, createObjectUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true";

      if (isInputField) return;

      const isMac = /mac/i.test(navigator.userAgent);
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      if (isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case "c":
            if (
              !readonly &&
              (selectedNodes.length > 0 || selectedEdges.length > 0)
            ) {
              event.preventDefault();
              copySelected();
            }
            break;
          case "x":
            if (
              !readonly &&
              (selectedNodes.length > 0 || selectedEdges.length > 0)
            ) {
              event.preventDefault();
              cutSelected();
            }
            break;
          case "v":
            if (!readonly && clipboardData) {
              event.preventDefault();
              pasteFromClipboard();
            }
            break;
          case "d":
            if (
              !readonly &&
              (selectedNodes.length > 0 || selectedEdges.length > 0)
            ) {
              event.preventDefault();
              duplicateSelected();
            }
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    readonly,
    selectedNodes,
    selectedEdges,
    clipboardData,
    copySelected,
    cutSelected,
    pasteFromClipboard,
    duplicateSelected,
  ]);

  return {
    nodes,
    edges,
    selectedNodes,
    selectedEdges,
    reactFlowInstance,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
    onNodesChange: handleNodesChangeInternal,
    onEdgesChange: readonly ? () => {} : onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onNodeDragStop: readonly ? () => {} : onNodeDragStop,
    connectionValidationState,
    isValidConnection,
    handleAddNode,
    handleNodeSelect,
    setReactFlowInstance,
    updateNodeExecution,
    updateNodeData: readonly ? () => {} : updateNodeData,
    updateEdgeData: readonly ? () => {} : updateEdgeData,
    deleteNode: readonly ? () => {} : deleteNode,
    deleteEdge: readonly ? () => {} : deleteEdge,
    deleteSelected: readonly ? () => {} : deleteSelected,
    duplicateNode: readonly ? () => {} : duplicateNode,
    duplicateSelected: readonly ? () => {} : duplicateSelected,
    isEditNodeNameDialogOpen,
    toggleEditNodeNameDialog,
    applyLayout,
    copySelected: readonly ? () => {} : copySelected,
    cutSelected: readonly ? () => {} : cutSelected,
    pasteFromClipboard: readonly ? () => {} : pasteFromClipboard,
    hasClipboardData: !!clipboardData && clipboardData.nodes.length > 0,
  };
}
