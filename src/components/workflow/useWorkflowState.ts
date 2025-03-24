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

  // Effect to notify parent of changes
  useEffect(() => {
    onNodesChangeCallback?.(nodes);
  }, [nodes, onNodesChangeCallback]);

  useEffect(() => {
    onEdgesChangeCallback?.(edges);
  }, [edges, onEdgesChangeCallback]);

  // Handle node selection
  const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    event.stopPropagation();
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

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

  // Handle edge selection
  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: any) => {
      event.stopPropagation();
      setSelectedEdge(edge);
      setSelectedNode(null);

      // Update z-indices when an edge is selected
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

    // Reset all edge z-indices
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        zIndex: 0,
      }))
    );
  }, [setEdges]);

  // Handle connection start
  const onConnectStart = useCallback((_event: any, params: any) => {
    if (params) {
      setConnectionValidationState("default");
    }
  }, []);

  // Handle connection end
  const onConnectEnd = useCallback(() => {
    setConnectionValidationState("default");
  }, []);

  // Function to validate connection based on type compatibility
  const isValidConnection = useCallback(
    (connection: any) => {
      if (!connection.source || !connection.target) return false;

      // Find the source and target nodes
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      // Find the specific output and input parameters
      const sourceOutput = sourceNode.data.outputs.find(
        (output) => output.id === connection.sourceHandle
      );
      const targetInput = targetNode.data.inputs.find(
        (input) => input.id === connection.targetHandle
      );

      if (!sourceOutput || !targetInput) return false;

      // Check if types are compatible
      const typesMatch =
        sourceOutput.type === targetInput.type ||
        sourceOutput.type === "any" ||
        targetInput.type === "any";

      // Update validation state to provide visual feedback
      setConnectionValidationState(typesMatch ? "valid" : "invalid");

      // Also run the external validation if provided
      return typesMatch && validateConnection(connection);
    },
    [nodes, validateConnection]
  );

  // Handle connection
  const onConnect = useCallback(
    (connection: any) => {
      if (!connection.source || !connection.target) return;

      const isValid = isValidConnection(connection);

      if (isValid) {
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
          // Update all existing edges to have zIndex 0
          const updatedEdges = eds.map((edge) => ({
            ...edge,
            zIndex: 0,
          }));
          // Add the new edge
          return addEdge(newEdge, updatedEdges);
        });
      }
    },
    [setEdges, isValidConnection]
  );

  // Handle adding a new node
  const handleAddNode = useCallback(() => {
    setIsNodeSelectorOpen(true);
  }, []);

  // Handle node template selection
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

  // Update node execution state
  const updateNodeExecutionState = useCallback(
    (nodeId: string, state: NodeExecutionState) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                executionState: state,
                error: state === "error" ? node.data.error : null,
              },
            };
          }
          return node;
        })
      );

      // Update edge active state based on execution
      if (state === "executing") {
        const nodeEdges = getConnectedEdges([{ id: nodeId } as any], edges);
        setEdges((eds) =>
          eds.map((edge) => {
            const isConnectedToExecutingNode = nodeEdges.some(
              (e) => e.id === edge.id
            );
            return {
              ...edge,
              data: {
                ...edge.data,
                isActive: isConnectedToExecutingNode,
              },
            };
          })
        );
      } else if (state === "completed" || state === "error") {
        setEdges((eds) =>
          eds.map((edge) => ({
            ...edge,
            data: {
              ...edge.data,
              isActive: false,
            },
          }))
        );
      }
    },
    [edges, setEdges, setNodes]
  );

  // Update node data
  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<WorkflowNodeData>) => {
      console.log(`Updating node ${nodeId} with data:`, data);

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const updatedNode = {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
            console.log(`Node ${nodeId} updated:`, updatedNode);
            return updatedNode;
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // Update node outputs specifically
  const updateNodeOutputs = useCallback(
    (nodeId: string, outputs: Record<string, any>) => {
      console.log(`Updating node ${nodeId} outputs:`, outputs);

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            // Map through existing outputs and update values when they exist in the outputs object
            const updatedOutputs = node.data.outputs.map((output) => ({
              ...output,
              value:
                outputs[output.id] !== undefined
                  ? outputs[output.id]
                  : output.value,
            }));

            const updatedNode = {
              ...node,
              data: {
                ...node.data,
                outputs: updatedOutputs,
              },
            };

            console.log(`Node ${nodeId} outputs updated:`, updatedNode);
            return updatedNode;
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // Update edge data
  const updateEdgeData = useCallback(
    (edgeId: string, data: Partial<WorkflowEdgeData>) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            return {
              ...edge,
              data: {
                ...edge.data,
                ...data,
              },
            };
          }
          return edge;
        })
      );
    },
    [setEdges]
  );

  // Delete node and its connected edges
  const deleteNode = useCallback(
    (nodeId: string) => {
      // First find all edges connected to this node
      const nodeEdges = getConnectedEdges([{ id: nodeId } as any], edges);
      const edgeIdsToRemove = nodeEdges.map((edge) => edge.id);

      // Remove the edges
      if (edgeIdsToRemove.length > 0) {
        setEdges((eds) =>
          eds.filter((edge) => !edgeIdsToRemove.includes(edge.id))
        );
      }

      // Remove the node
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));

      // If this was the selected node, clear the selection
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
    updateNodeData,
    updateNodeOutputs,
    updateEdgeData,
    deleteNode,
  };
}
