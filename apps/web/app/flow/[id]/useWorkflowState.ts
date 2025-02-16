import { useState, useCallback, useEffect } from 'react';
import {
  useNodesState,
  useEdgesState,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  Connection,
  addEdge,
  NodeChange,
  EdgeChange,
  ReactFlowInstance,
  XYPosition,
  OnConnectStartParams,
  OnConnectStart,
  OnConnectEnd,
} from 'reactflow';
import { Node, Edge, Graph, Parameter } from '@repo/workflow';
import { WorkflowNodeType } from './workflow-templates';

type NodeExecutionState = 'idle' | 'executing' | 'completed' | 'error';
type ConnectionValidationState = 'default' | 'valid' | 'invalid';

// Convert workflow nodes to ReactFlow nodes
const convertToReactFlowNodes = (nodes: Node[]): ReactFlowNode[] => {
  return nodes.map(node => ({
    id: node.id,
    type: 'workflowNode',
    position: node.position,
    data: {
      name: node.name,
      inputs: node.inputs,
      outputs: node.outputs,
      error: node.error,
      executionState: 'idle' as NodeExecutionState,
    },
  }));
};

// Convert workflow edges to ReactFlow edges
const convertToReactFlowEdges = (edges: Edge[]): ReactFlowEdge[] => {
  return edges.map((edge, index) => ({
    id: `e${index}`,
    type: 'workflowEdge',
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceOutput,
    targetHandle: edge.targetInput,
  }));
};

// Convert ReactFlow connection to workflow edge
const convertToWorkflowEdge = (connection: Connection): Edge => {
  return {
    source: connection.source || '',
    target: connection.target || '',
    sourceOutput: connection.sourceHandle || '',
    targetInput: connection.targetHandle || '',
  };
};

interface UseWorkflowStateProps {
  initialWorkflowGraph: Graph;
  onWorkflowChange?: (graph: Graph) => void;
}

interface UseWorkflowStateReturn {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  selectedNode: ReactFlowNode | null;
  selectedEdge: ReactFlowEdge | null;
  reactFlowInstance: ReactFlowInstance | null;
  isNodeSelectorOpen: boolean;
  setIsNodeSelectorOpen: (open: boolean) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  connectionValidationState: ConnectionValidationState;
  handleNodeClick: (event: React.MouseEvent, node: ReactFlowNode) => void;
  handleEdgeClick: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  handlePaneClick: () => void;
  handleAddNode: () => void;
  handleNodeSelect: (template: WorkflowNodeType) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  updateNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
}

export function useWorkflowState({
  initialWorkflowGraph,
  onWorkflowChange,
}: UseWorkflowStateProps): UseWorkflowStateReturn {
  // State management
  const [workflowGraph, setWorkflowGraph] = useState<Graph>(initialWorkflowGraph);
  const [nodes, setNodes, onNodesChange] = useNodesState(convertToReactFlowNodes(workflowGraph.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertToReactFlowEdges(workflowGraph.edges));
  const [selectedNode, setSelectedNode] = useState<ReactFlowNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ReactFlowEdge | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [pendingGraphUpdate, setPendingGraphUpdate] = useState<Graph | null>(null);
  const [connectionValidationState, setConnectionValidationState] = useState<ConnectionValidationState>('default');
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [connectingHandleId, setConnectingHandleId] = useState<string | null>(null);
  const [connectingHandleType, setConnectingHandleType] = useState<'source' | 'target' | null>(null);

  // Effect to handle workflow changes after state updates are complete
  useEffect(() => {
    if (pendingGraphUpdate) {
      onWorkflowChange?.(pendingGraphUpdate);
      setPendingGraphUpdate(null);
    }
  }, [pendingGraphUpdate, onWorkflowChange]);

  // Effect to update state when initialWorkflowGraph changes
  useEffect(() => {
    setWorkflowGraph(initialWorkflowGraph);
    setNodes(convertToReactFlowNodes(initialWorkflowGraph.nodes));
    setEdges(convertToReactFlowEdges(initialWorkflowGraph.edges));
  }, [initialWorkflowGraph, setNodes, setEdges]);

  // Custom nodes change handler
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // First apply the changes to ReactFlow's state
    onNodesChange(changes);

    // Handle node removals
    const nodeRemovals = changes.filter(
      (change): change is NodeChange & { type: 'remove'; id: string } =>
        change.type === 'remove'
    );

    if (nodeRemovals.length > 0) {
      setWorkflowGraph((prevGraph: Graph) => {
        // Get the IDs of nodes being removed
        const removedNodeIds = new Set(nodeRemovals.map(change => change.id));
        
        // Filter out the removed nodes from the workflow graph
        const remainingNodes = prevGraph.nodes.filter(node => !removedNodeIds.has(node.id));
        
        // Filter out edges connected to removed nodes
        const remainingEdges = prevGraph.edges.filter(
          edge => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target)
        );
        
        const newGraph = {
          ...prevGraph,
          nodes: remainingNodes,
          edges: remainingEdges,
        };
        
        setPendingGraphUpdate(newGraph);
        return newGraph;
      });
    }

    // Handle position changes
    const positionChanges = changes.filter(
      (change): change is NodeChange & { type: 'position'; position: XYPosition } =>
        change.type === 'position' && 'position' in change
    );

    if (positionChanges.length > 0) {
      setWorkflowGraph((prevGraph: Graph) => {
        const updatedNodes = prevGraph.nodes.map((node) => {
          const change = positionChanges.find((c) => c.id === node.id);
          if (change) {
            return {
              ...node,
              position: change.position,
            };
          }
          return node;
        });
        
        const newGraph = {
          ...prevGraph,
          nodes: updatedNodes,
        };
        
        setPendingGraphUpdate(newGraph);
        return newGraph;
      });
    }
  }, [onNodesChange]);

  // Custom edges change handler
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    // First apply the changes to ReactFlow's state
    onEdgesChange(changes);

    // Then update our workflow graph for edge removals
    const edgeRemovals = changes.filter(
      (change): change is EdgeChange & { type: 'remove'; id: string } =>
        change.type === 'remove'
    );

    if (edgeRemovals.length > 0) {
      setWorkflowGraph((prevGraph: Graph) => {
        // Get the IDs of edges being removed
        const removedEdgeIds = new Set(edgeRemovals.map(change => change.id));
        
        // Filter out the removed edges from the workflow graph
        const remainingEdges = prevGraph.edges.filter((_, index) => !removedEdgeIds.has(`e${index}`));
        
        const newGraph = {
          ...prevGraph,
          edges: remainingEdges,
        };
        
        setPendingGraphUpdate(newGraph);
        return newGraph;
      });
    }
  }, [onEdgesChange]);

  // Validate connection types
  const validateConnection = useCallback((sourceNode: ReactFlowNode, targetNode: ReactFlowNode, sourceHandle: string, targetHandle: string) => {
    const sourceParam = sourceNode.data.outputs.find((o: Parameter) => o.name === sourceHandle);
    const targetParam = targetNode.data.inputs.find((i: Parameter) => i.name === targetHandle);

    if (!sourceParam || !targetParam) {
      return false;
    }

    return sourceParam.type === targetParam.type;
  }, []);

  const onConnectStart: OnConnectStart = useCallback((event, params: OnConnectStartParams) => {
    console.log('Connect start:', params);
    setConnectingNodeId(params.nodeId);
    setConnectingHandleId(params.handleId);
    setConnectingHandleType(params.handleType);
    setConnectionValidationState('default');
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback((event) => {
    console.log('Connect end');
    setConnectingNodeId(null);
    setConnectingHandleId(null);
    setConnectingHandleType(null);
    setConnectionValidationState('default');
  }, []);

  // Check connection validity during mouse move
  useEffect(() => {
    if (!connectingNodeId || !connectingHandleId || !connectingHandleType) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!reactFlowInstance) return;

      // Convert mouse position to flow coordinates
      const viewport = reactFlowInstance.getViewport();
      const position = reactFlowInstance.project({
        x: event.clientX,
        y: event.clientY,
      });

      // Find if we're hovering over any node
      const targetNode = nodes.find(node => {
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        const nodeWidth = 200; // Approximate node width
        const nodeHeight = 100; // Approximate node height
        
        return (
          position.x >= nodeX &&
          position.x <= nodeX + nodeWidth &&
          position.y >= nodeY &&
          position.y <= nodeY + nodeHeight
        );
      });

      if (!targetNode || targetNode.id === connectingNodeId) {
        console.log('No target node or same node, setting default');
        setConnectionValidationState('default');
        return;
      }

      const sourceNode = nodes.find(node => node.id === connectingNodeId);
      if (!sourceNode) {
        console.log('No source node, setting default');
        setConnectionValidationState('default');
        return;
      }

      // Check if we can connect to any handle of the target node
      let canConnect = false;
      if (connectingHandleType === 'source') {
        // We're dragging from an output, so check target's inputs
        canConnect = targetNode.data.inputs.some((input: Parameter) =>
          validateConnection(sourceNode, targetNode, connectingHandleId, input.name)
        );
      } else {
        // We're dragging from an input, so check target's outputs
        canConnect = targetNode.data.outputs.some((output: Parameter) =>
          validateConnection(targetNode, sourceNode, output.name, connectingHandleId)
        );
      }

      console.log('Connection validation:', canConnect ? 'valid' : 'invalid');
      setConnectionValidationState(canConnect ? 'valid' : 'invalid');
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [connectingNodeId, connectingHandleId, connectingHandleType, nodes, reactFlowInstance, validateConnection]);

  // Handle new connections, replacing existing ones if necessary
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.target || !connection.targetHandle || !connection.source || !connection.sourceHandle) return;

    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (!sourceNode || !targetNode) {
      console.error('Invalid connection: source or target node not found');
      setConnectionValidationState('invalid');
      return;
    }

    const isValid = validateConnection(sourceNode, targetNode, connection.sourceHandle, connection.targetHandle);
    setConnectionValidationState(isValid ? 'valid' : 'invalid');

    if (!isValid) {
      console.error(`Type mismatch: Cannot connect incompatible types`);
      return;
    }

    setWorkflowGraph((prevGraph: Graph) => {
      // Remove any existing edges connected to the target input
      const remainingEdges = prevGraph.edges.filter(
        edge => !(edge.target === connection.target && edge.targetInput === connection.targetHandle)
      );

      // Add the new edge
      const newEdge = convertToWorkflowEdge(connection);
      const newEdges = [...remainingEdges, newEdge];

      const newGraph = {
        ...prevGraph,
        edges: newEdges,
      };

      setPendingGraphUpdate(newGraph);
      return newGraph;
    });

    // Update ReactFlow edges state
    setEdges(edges => {
      // Remove existing edges connected to the target input
      const remainingEdges = edges.filter(
        edge => !(edge.target === connection.target && edge.targetHandle === connection.targetHandle)
      );

      // Add the new edge with type validation
      const edge = {
        ...connection,
        type: 'workflowEdge',
        data: { isValid: true },
      };
      return addEdge(edge, remainingEdges);
    });
  }, [nodes, validateConnection]);

  // Event handlers
  const handleNodeClick = useCallback((event: React.MouseEvent, node: ReactFlowNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: ReactFlowEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleAddNode = useCallback(() => {
    setIsNodeSelectorOpen(true);
  }, []);

  const handleNodeSelect = useCallback((template: WorkflowNodeType) => {
    if (!reactFlowInstance) return;

    const position = reactFlowInstance.project({
      x: Math.random() * 500,
      y: Math.random() * 500,
    });

    const newNode = template.createNode(position);
    
    setNodes((nds) => [...nds, ...convertToReactFlowNodes([newNode])]);
    
    setWorkflowGraph((prevGraph: Graph) => {
      const newGraph = {
        ...prevGraph,
        nodes: [...prevGraph.nodes, newNode],
      };
      setPendingGraphUpdate(newGraph);
      return newGraph;
    });
    
    setIsNodeSelectorOpen(false);
  }, [reactFlowInstance, setNodes]);

  const updateNodeExecutionState = useCallback((nodeId: string, state: NodeExecutionState) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              executionState: state,
              error: state === 'error' ? node.data.error : null,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  return {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    reactFlowInstance,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
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
  };
} 