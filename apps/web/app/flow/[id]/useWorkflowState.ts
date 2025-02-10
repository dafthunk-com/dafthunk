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
} from 'reactflow';
import { Node, Edge, Graph } from '@repo/workflow';
import { WorkflowNodeType } from './workflow-templates';

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
  handleNodeClick: (event: React.MouseEvent, node: ReactFlowNode) => void;
  handleEdgeClick: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  handlePaneClick: () => void;
  handleAddNode: () => void;
  handleNodeSelect: (template: WorkflowNodeType) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
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

    // Then update our workflow graph for position changes
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

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'workflowEdge',
      };
      setEdges((eds) => addEdge(edge, eds));
      
      setWorkflowGraph((prevGraph: Graph) => {
        const newGraph = {
          ...prevGraph,
          edges: [...prevGraph.edges, convertToWorkflowEdge(params)],
        };
        setPendingGraphUpdate(newGraph);
        return newGraph;
      });
    },
    [setEdges]
  );

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
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleAddNode,
    handleNodeSelect,
    setReactFlowInstance,
  };
} 