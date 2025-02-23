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
  OnConnect,
} from 'reactflow';
import { Graph, Parameter } from '@/lib/workflowTypes';
import { Node, NodeType, NodeExecutionState } from '@/lib/workflowTypes';
import { workflowNodeService } from '@/services/workflowNodeService';
import { workflowEdgeService, ConnectionValidationState } from '@/services/workflowEdgeService';

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
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  connectionValidationState: ConnectionValidationState;
  handleNodeClick: (event: React.MouseEvent, node: ReactFlowNode) => void;
  handleEdgeClick: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  handlePaneClick: () => void;
  handleAddNode: () => void;
  handleNodeSelect: (template: NodeType) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  updateNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
  onAddNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
}

export function useWorkflowState({
  initialWorkflowGraph,
  onWorkflowChange,
}: UseWorkflowStateProps): UseWorkflowStateReturn {
  // State management
  const [workflowGraph, setWorkflowGraph] = useState<Graph>(initialWorkflowGraph);
  const [nodes, setNodes, onNodesChange] = useNodesState(workflowNodeService.convertToReactFlowNodes(workflowGraph.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflowEdgeService.convertToReactFlowEdges(workflowGraph.edges));
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
    setNodes(workflowNodeService.convertToReactFlowNodes(initialWorkflowGraph.nodes));
    setEdges(workflowEdgeService.convertToReactFlowEdges(initialWorkflowGraph.edges));
  }, [initialWorkflowGraph, setNodes, setEdges]);

  // Custom nodes change handler
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);

    // Handle node removals
    const nodeRemovals = changes.filter(
      (change): change is NodeChange & { type: 'remove'; id: string } =>
        change.type === 'remove'
    );

    if (nodeRemovals.length > 0) {
      setWorkflowGraph((prevGraph: Graph) => {
        const removedNodeIds = new Set(nodeRemovals.map(change => change.id));
        const remainingNodes = prevGraph.nodes.filter(node => !removedNodeIds.has(node.id));
        const remainingEdges = prevGraph.edges.filter(
          edge => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target)
        );
        
        const newGraph = { ...prevGraph, nodes: remainingNodes, edges: remainingEdges };
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
        const updatedNodes = prevGraph.nodes.map(node => {
          const change = positionChanges.find(c => c.id === node.id);
          return change ? { ...node, position: change.position } : node;
        });
        
        const newGraph = { ...prevGraph, nodes: updatedNodes };
        setPendingGraphUpdate(newGraph);
        return newGraph;
      });
    }
  }, [onNodesChange]);

  // Custom edges change handler
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);

    const edgeRemovals = changes.filter(
      (change): change is EdgeChange & { type: 'remove'; id: string } =>
        change.type === 'remove'
    );

    if (edgeRemovals.length > 0) {
      setWorkflowGraph((prevGraph: Graph) => {
        const removedEdgeIds = new Set(edgeRemovals.map(change => change.id));
        const remainingEdges = prevGraph.edges.filter((_, index) => !removedEdgeIds.has(`e${index}`));
        
        const newGraph = { ...prevGraph, edges: remainingEdges };
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

  const onConnectStart: OnConnectStart = useCallback((_, params: OnConnectStartParams) => {
    setConnectingNodeId(params.nodeId);
    setConnectingHandleId(params.handleId);
    setConnectingHandleType(params.handleType);
    setConnectionValidationState('default');
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(() => {
    setConnectingNodeId(null);
    setConnectingHandleId(null);
    setConnectingHandleType(null);
    setConnectionValidationState('default');
  }, []);

  // Check connection validity during mouse move
  useEffect(() => {
    if (!connectingNodeId || !connectingHandleId || !connectingHandleType || !reactFlowInstance) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const position = reactFlowInstance.project({
        x: event.clientX,
        y: event.clientY,
      });

      const targetNode = nodes.find(node => {
        const { x, y } = node.position;
        return (
          position.x >= x &&
          position.x <= x + 200 && // Approximate node width
          position.y >= y &&
          position.y <= y + 100 // Approximate node height
        );
      });

      if (!targetNode || targetNode.id === connectingNodeId) {
        setConnectionValidationState('default');
        return;
      }

      const sourceNode = nodes.find(node => node.id === connectingNodeId);
      if (!sourceNode) {
        setConnectionValidationState('default');
        return;
      }

      let canConnect = false;
      if (connectingHandleType === 'source') {
        canConnect = targetNode.data.inputs.some((input: Parameter) =>
          validateConnection(sourceNode, targetNode, connectingHandleId, input.name)
        );
      } else {
        canConnect = targetNode.data.outputs.some((output: Parameter) =>
          validateConnection(targetNode, sourceNode, output.name, connectingHandleId)
        );
      }

      setConnectionValidationState(canConnect ? 'valid' : 'invalid');
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [connectingNodeId, connectingHandleId, connectingHandleType, nodes, reactFlowInstance, validateConnection]);

  // Handle new connections
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    if (!connection.target || !connection.targetHandle || !connection.source || !connection.sourceHandle) return;

    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (!sourceNode || !targetNode) {
      setConnectionValidationState('invalid');
      return;
    }

    const isValid = validateConnection(sourceNode, targetNode, connection.sourceHandle, connection.targetHandle);
    setConnectionValidationState(isValid ? 'valid' : 'invalid');

    if (!isValid) return;

    setWorkflowGraph((prevGraph: Graph) => {
      const remainingEdges = prevGraph.edges.filter(
        edge => !(edge.target === connection.target && edge.targetInput === connection.targetHandle)
      );

      const newEdge = workflowEdgeService.convertToWorkflowEdge(connection);
      const newEdges = [...remainingEdges, newEdge];
      const newGraph = { ...prevGraph, edges: newEdges };

      setPendingGraphUpdate(newGraph);
      return newGraph;
    });

    setEdges(edges => {
      const remainingEdges = edges.filter(
        edge => !(edge.target === connection.target && edge.targetHandle === connection.targetHandle)
      );

      const edge = {
        ...connection,
        type: 'workflowEdge',
        data: { isValid: true },
      };
      return addEdge(edge, remainingEdges);
    });
  }, [nodes, validateConnection]);

  // Event handlers
  const handleNodeClick = useCallback((_: React.MouseEvent, node: ReactFlowNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: ReactFlowEdge) => {
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

  const handleNodeSelect = useCallback((template: NodeType) => {
    if (!reactFlowInstance) return;

    const position = reactFlowInstance.project({
      x: Math.random() * 500,
      y: Math.random() * 500,
    });

    const newNode = workflowNodeService.createNode(template, position);
    
    setNodes(nds => [...nds, ...workflowNodeService.convertToReactFlowNodes([newNode])]);
    
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
    setNodes(nds => workflowNodeService.updateNodeExecutionState(nds, nodeId, state));
  }, [setNodes]);

  const onAddNode = useCallback((nodeType: NodeType, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: nodeType.type,
      name: nodeType.name,
      position,
      inputs: nodeType.inputs,
      outputs: nodeType.outputs,
    };

    setNodes(nds => [
      ...nds,
      {
        id: newNode.id,
        type: 'workflowNode',
        position: newNode.position,
        data: {
          name: newNode.name,
          inputs: newNode.inputs,
          outputs: newNode.outputs,
        },
      },
    ]);

    setWorkflowGraph((prevGraph: Graph) => {
      const newGraph = {
        ...prevGraph,
        nodes: [...prevGraph.nodes, newNode],
      };
      setPendingGraphUpdate(newGraph);
      return newGraph;
    });
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
    onAddNode,
  };
} 