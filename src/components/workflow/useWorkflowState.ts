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

  // Handle edge selection
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

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

  // Handle connection
  const onConnect = useCallback(
    (connection: any) => {
      if (!connection.source || !connection.target) return;

      const isValid = validateConnection(connection);

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
        };

        setEdges((eds) => addEdge(newEdge, eds));
      }
    },
    [setEdges, validateConnection]
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
          label: template.label,
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
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
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
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleAddNode,
    handleNodeSelect,
    setReactFlowInstance,
    updateNodeExecutionState,
    updateNodeData,
    updateEdgeData,
  };
}
