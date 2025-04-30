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

  // Effect to notify parent of changes for nodes
  useEffect(() => {
    // Only notify parent if the change is not an execution state update
    const hasNonExecutionChanges = nodes.some(node => {
      const initialNode = initialNodes.find(n => n.id === node.id);
      if (!initialNode) {
        console.log(`New node detected: ${node.id}`);
        return true; // New node is definitely a non-execution change
      }

      // Check for position changes - these should always trigger a save
      if (
        node.position.x !== initialNode.position.x || 
        node.position.y !== initialNode.position.y
      ) {
        console.log(`Node ${node.id} position changed`);
        return true;
      }

      // Remove execution-only fields for comparison
      const stripExecutionFields = (data: WorkflowNodeData) => {
        const { executionState, error, ...rest } = data;
        
        // Create a clean copy without execution-related data
        return {
          ...rest,
          outputs: data.outputs.map(output => {
            const { value, isConnected, ...outputRest } = output;
            return outputRest;
          }),
          inputs: data.inputs.map(input => {
            const { isConnected, ...inputRest } = input;
            return inputRest;
          })
        };
      };

      const nodeData = stripExecutionFields(node.data);
      const initialNodeData = stripExecutionFields(initialNode.data);

      const nodeDataStr = JSON.stringify(nodeData);
      const initialNodeDataStr = JSON.stringify(initialNodeData);
      
      const isDifferent = nodeDataStr !== initialNodeDataStr;
      
      if (isDifferent) {
        console.log(`Node ${node.id} has non-execution changes`);
        // Uncomment for detailed debugging when needed
        // console.log('Current:', nodeDataStr);
        // console.log('Initial:', initialNodeDataStr);
      }
      
      return isDifferent;
    });

    if (hasNonExecutionChanges) {
      console.log('Triggering onNodesChangeCallback due to non-execution changes');
      onNodesChangeCallback?.(nodes);
    }
  }, [nodes, onNodesChangeCallback, initialNodes]);

  // Effect to notify parent of changes for edges
  useEffect(() => {
    // Only notify parent if the change is not an execution-related change
    const hasNonExecutionChanges = edges.some(edge => {
      const initialEdge = initialEdges.find(e => e.id === edge.id);
      if (!initialEdge) {
        console.log(`New edge detected: ${edge.id}`);
        return true; // New edge is definitely a non-execution change
      }

      // Remove execution-only fields for comparison
      const stripExecutionFields = (data: WorkflowEdgeData = {}) => {
        const { isActive, ...rest } = data;
        return rest;
      };

      const edgeData = stripExecutionFields(edge.data);
      const initialEdgeData = stripExecutionFields(initialEdge.data);

      // Also check for structural changes (source, target, handles)
      if (
        edge.source !== initialEdge.source ||
        edge.target !== initialEdge.target ||
        edge.sourceHandle !== initialEdge.sourceHandle ||
        edge.targetHandle !== initialEdge.targetHandle
      ) {
        console.log(`Edge ${edge.id} connection changed`);
        return true;
      }

      const edgeDataStr = JSON.stringify(edgeData);
      const initialEdgeDataStr = JSON.stringify(initialEdgeData);
      
      const isDifferent = edgeDataStr !== initialEdgeDataStr;
      
      if (isDifferent) {
        console.log(`Edge ${edge.id} has non-execution changes`);
        // Uncomment for detailed debugging when needed
        // console.log('Current:', edgeDataStr);
        // console.log('Initial:', initialEdgeDataStr);
      }
      
      return isDifferent;
    });

    if (hasNonExecutionChanges) {
      console.log('Triggering onEdgesChangeCallback due to non-execution changes');
      onEdgesChangeCallback?.(edges);
    }
  }, [edges, onEdgesChangeCallback, initialEdges]);

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
          // Remove any existing edge with the same target input
          const filteredEdges = eds.filter(
            (edge) =>
              !(
                edge.target === connection.target &&
                edge.targetHandle === connection.targetHandle
              )
          );

          // Update all existing edges to have zIndex 0
          const updatedEdges = filteredEdges.map((edge) => ({
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

  // Update node execution state without triggering save
  const updateNodeExecutionState = useCallback(
    (nodeId: string, state: NodeExecutionState) => {
      console.log(`Setting node ${nodeId} execution state to: ${state}`);
      
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

      // Use a separate function for updating edge active states to avoid
      // creating unnecessary dependencies and potential infinite loops
      updateEdgesForNodeExecution(nodeId, state);
    },
    [setNodes]
  );

  // Separated edge update logic to avoid dependency issues
  const updateEdgesForNodeExecution = useCallback(
    (nodeId: string, state: NodeExecutionState) => {
      console.log(`Updating edges for node ${nodeId} execution state: ${state}`);
      
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
    [edges, setEdges]
  );

  // Update node execution outputs without triggering save
  const updateNodeExecutionOutputs = useCallback(
    (nodeId: string, outputs: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                outputs: node.data.outputs.map((output) => ({
                  ...output,
                  value: outputs[output.id],
                })),
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // Update node execution error without triggering save
  const updateNodeExecutionError = useCallback(
    (nodeId: string, error: string | undefined) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                error,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
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
    updateNodeExecutionOutputs,
    updateNodeExecutionError,
    updateNodeData,
    updateNodeOutputs,
    updateEdgeData,
    deleteNode,
  };
}
