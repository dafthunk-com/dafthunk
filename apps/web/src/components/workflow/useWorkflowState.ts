import { useState, useCallback, useEffect, useRef } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  getConnectedEdges,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  ReactFlowInstance,
  NodeChange,
} from "@xyflow/react";
import {
  WorkflowNodeType,
  WorkflowEdgeType,
  NodeTemplate,
  ConnectionValidationState,
  UseWorkflowStateProps,
  UseWorkflowStateReturn,
  NodeExecutionState,
  NodeExecutionUpdate,
} from "./workflow-types";
import { workflowExecutionService } from "@/services/workflowExecutionService";

export function useWorkflowState({
  initialNodes = [],
  initialEdges = [],
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  validateConnection = () => true,
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
    // Prevent resetting nodes if initialNodes is empty and nodesRef.current already exist (and not readonly)
    // This can happen during initial load sequences.
    if (!readonly && initialNodes.length === 0 && nodesRef.current.length > 0) {
      // Allow resetting if it's a deliberate empty array after having nodes
      // For readonly, we always want to reflect initialNodes.
    } else {
      // Deep comparison might be too expensive.
      // React Flow's setNodes should handle memoization if the array instance is the same.
      // Consider a more sophisticated check if performance issues arise.
      if (JSON.stringify(nodesRef.current) !== JSON.stringify(initialNodes)) {
        setNodes(initialNodes);
      }
    }
  }, [initialNodes, readonly, setNodes]); // Removed nodes, relying on nodesRef.current

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

    // 1. Check if the number of nodes has changed.
    const nodeCountChanged = nodes.length !== initialNodes.length;

    // 2. Check if any existing node's position or non-execution data has changed,
    // or if a new node has been added (which would be caught by initialNodes.find returning undefined).
    const hasDataOrPositionChanges = nodes.some((node) => {
      const initialNode = initialNodes.find((n) => n.id === node.id);
      if (!initialNode) return true; // New node added

      if (
        node.position.x !== initialNode.position.x ||
        node.position.y !== initialNode.position.y
      ) {
        return true; // Position changed
      }

      const nodeData = workflowExecutionService.stripExecutionFields(node.data);
      const initialNodeData = workflowExecutionService.stripExecutionFields(
        initialNode.data
      );
      return JSON.stringify(nodeData) !== JSON.stringify(initialNodeData); // Data changed
    });

    // If either the count changed OR data/position of existing nodes changed, propagate.
    if (nodeCountChanged || hasDataOrPositionChanges) {
      onNodesChangeCallback?.(nodes);
    }
  }, [nodes, onNodesChangeCallback, initialNodes, readonly]);

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

      const edgeData = workflowExecutionService.stripEdgeExecutionFields(
        edge.data
      );
      const initialEdgeData = workflowExecutionService.stripEdgeExecutionFields(
        initialEdge.data
      );

      return JSON.stringify(edgeData) !== JSON.stringify(initialEdgeData);
    });

    if (hasNonExecutionChanges) {
      onEdgesChangeCallback?.(edges);
    }
  }, [edges, onEdgesChangeCallback, initialEdges, readonly]);

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
  const handleNodesChange = useCallback(
    (changes: NodeChange<ReactFlowNode<WorkflowNodeType>>[]) => {
      if (readonly) {
        // In readonly mode, only allow selection changes.
        // Other changes like position, dimensions, remove are disallowed.
        const selectionChanges = changes.filter(
          (change) => change.type === "select"
        );
        if (selectionChanges.length > 0) {
          onNodesChange(selectionChanges);
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
    [setEdges, isValidConnection, readonly]
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
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Unified function to update node execution data
  const updateNodeExecution = useCallback(
    (nodeId: string, update: NodeExecutionUpdate) => {
      const { state, outputs, error } = update;

      setNodes((nds) => {
        let updatedNodes = nds;

        if (state !== undefined) {
          updatedNodes = workflowExecutionService.updateNodesWithExecutionState(
            updatedNodes,
            nodeId,
            state
          );
        }

        if (outputs !== undefined) {
          updatedNodes =
            workflowExecutionService.updateNodesWithExecutionOutputs(
              updatedNodes,
              nodeId,
              outputs
            );
        }

        if (error !== undefined) {
          updatedNodes = workflowExecutionService.updateNodesWithExecutionError(
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
          ...workflowExecutionService.updateEdgesForNodeExecution(
            eds,
            nodeId,
            state,
            connectedEdgeIds
          ),
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
      const nodeEdges = getConnectedEdges([{ id: nodeId } as any], edges);
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
    [edges, selectedNode, setEdges, setNodes]
  );

  return {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    reactFlowInstance,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
    onNodesChange: handleNodesChange,
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
  };
}
