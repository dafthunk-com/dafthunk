import { useState, useCallback, useEffect } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  getConnectedEdges,
  Node as ReactFlowNode,
} from "reactflow";
import {
  WorkflowNodeData,
  WorkflowEdgeData,
  NodeTemplate,
  ConnectionValidationState,
  UseWorkflowStateProps,
  UseWorkflowStateReturn,
  NodeExecutionState,
} from "./workflow-types";
import { workflowExecutionService } from "@/services/workflowExecutionService";

export function useWorkflowState({
  initialNodes = [],
  initialEdges = [],
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  validateConnection = () => true,
}: UseWorkflowStateProps): UseWorkflowStateReturn {
  // State management
  const [nodes, setNodes, onNodesChange] =
    useNodesState<WorkflowNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<WorkflowEdgeData>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any | null>(null);
  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [connectionValidationState, setConnectionValidationState] =
    useState<ConnectionValidationState>("default");

  // Effect to notify parent of changes for nodes
  useEffect(() => {
    const hasNonExecutionChanges = nodes.some((node) => {
      const initialNode = initialNodes.find((n) => n.id === node.id);
      if (!initialNode) return true;

      if (
        node.position.x !== initialNode.position.x ||
        node.position.y !== initialNode.position.y
      )
        return true;

      const nodeData = workflowExecutionService.stripExecutionFields(node.data);
      const initialNodeData = workflowExecutionService.stripExecutionFields(
        initialNode.data
      );

      return JSON.stringify(nodeData) !== JSON.stringify(initialNodeData);
    });

    if (hasNonExecutionChanges) {
      onNodesChangeCallback?.(nodes);
    }
  }, [nodes, onNodesChangeCallback, initialNodes]);

  // Effect to notify parent of changes for edges
  useEffect(() => {
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
  }, [edges, onEdgesChangeCallback, initialEdges]);

  // Effect to keep selectedNode in sync with nodes state
  useEffect(() => {
    if (selectedNode) {
      const updatedNode = nodes.find((node) => node.id === selectedNode.id);
      if (
        updatedNode &&
        JSON.stringify(updatedNode) !== JSON.stringify(selectedNode)
      ) {
        setSelectedNode(updatedNode);
      }
    }
  }, [nodes, selectedNode]);

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
    setConnectionValidationState("default");
  }, []);

  const onConnectEnd = useCallback(() => {
    setConnectionValidationState("default");
  }, []);

  // Function to validate connection based on type compatibility
  const isValidConnection = useCallback(
    (connection: any) => {
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
    [nodes, validateConnection]
  );

  // Handle connection
  const onConnect = useCallback(
    (connection: any) => {
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
    [setEdges, isValidConnection]
  );

  // Node management
  const handleAddNode = useCallback(() => {
    setIsNodeSelectorOpen(true);
  }, []);

  const handleNodeSelect = useCallback(
    (template: NodeTemplate) => {
      if (!reactFlowInstance) return;

      const position = reactFlowInstance.project({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const newNode: ReactFlowNode<WorkflowNodeData> = {
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

  // Update node execution state without triggering save
  const updateNodeExecutionState = useCallback(
    (nodeId: string, state: NodeExecutionState) => {
      setNodes((nds) => [
        ...workflowExecutionService.updateNodesWithExecutionState(
          nds,
          nodeId,
          state
        ),
      ]);

      // Handle edge updates based on node execution state
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
    },
    [edges, setNodes, setEdges]
  );

  // Node data update functions
  const updateNodeExecutionOutputs = useCallback(
    (nodeId: string, outputs: Record<string, any>) => {
      setNodes((nds) => [
        ...workflowExecutionService.updateNodesWithExecutionOutputs(
          nds,
          nodeId,
          outputs
        ),
      ]);
    },
    [setNodes]
  );

  const updateNodeExecutionError = useCallback(
    (nodeId: string, error: string | undefined) => {
      setNodes((nds) => [
        ...workflowExecutionService.updateNodesWithExecutionError(
          nds,
          nodeId,
          error
        ),
      ]);
    },
    [setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<WorkflowNodeData>) => {
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

  const updateNodeOutputs = useCallback(
    (nodeId: string, outputs: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== nodeId) return node;

          const updatedOutputs = node.data.outputs.map((output) => ({
            ...output,
            value:
              outputs[output.id] !== undefined
                ? outputs[output.id]
                : output.value,
          }));

          return {
            ...node,
            data: {
              ...node.data,
              outputs: updatedOutputs,
            },
          };
        })
      );
    },
    [setNodes]
  );

  const updateEdgeData = useCallback(
    (edgeId: string, data: Partial<WorkflowEdgeData>) => {
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
    onNodesChange,
    onEdgesChange,
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
    updateNodeExecutionState,
    updateNodeExecutionOutputs,
    updateNodeExecutionError,
    updateNodeData,
    updateNodeOutputs,
    updateEdgeData,
    deleteNode,
  };
}
