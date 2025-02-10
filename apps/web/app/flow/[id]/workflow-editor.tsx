'use client';

import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  Connection,
  BackgroundVariant,
  ConnectionMode,
  ConnectionLineType,
  ReactFlowInstance,
} from 'reactflow';
import { WorkflowNode as WorkflowNodeComponent } from './workflow-node';
import { WorkflowEdge as WorkflowEdgeComponent } from './workflow-edge';
import { Node, Edge, Graph } from '@repo/workflow';
import { WorkflowSidebar } from './workflow-sidebar';
import 'reactflow/dist/style.css';
import { NodeSelector } from './node-selector';
import { NodeTemplate } from './workflow-templates';
import { Button } from "@repo/ui/button";

const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

const edgeTypes = {
  workflowEdge: WorkflowEdgeComponent,
};

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

interface WorkflowEditorProps {
  initialWorkflowGraph: Graph;
  onWorkflowChange?: (graph: Graph) => void;
}

export function WorkflowEditor({ initialWorkflowGraph, onWorkflowChange }: WorkflowEditorProps) {
  const [workflowGraph, setWorkflowGraph] = useState<Graph>(initialWorkflowGraph);
  const [nodes, setNodes, onNodesChange] = useNodesState(convertToReactFlowNodes(workflowGraph.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertToReactFlowEdges(workflowGraph.edges));
  const [selectedNode, setSelectedNode] = useState<ReactFlowNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ReactFlowEdge | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);

  // Add custom edges change handler
  const handleEdgesChange = useCallback((changes: any[]) => {
    // First apply the changes to ReactFlow's state
    onEdgesChange(changes);

    // Then update our workflow graph for edge removals
    const edgeRemovals = changes.filter(
      (change) => change.type === 'remove'
    );

    if (edgeRemovals.length > 0) {
      setWorkflowGraph((prevGraph: Graph) => {
        // Get the IDs of edges being removed
        const removedEdgeIds = new Set(edgeRemovals.map(change => change.id));
        
        // Filter out the removed edges from the workflow graph
        // We need to reconstruct the edge ID to match ReactFlow's format (e${index})
        const remainingEdges = prevGraph.edges.filter((_, index) => !removedEdgeIds.has(`e${index}`));
        
        const newGraph = {
          ...prevGraph,
          edges: remainingEdges,
        };
        
        // Notify parent of the change
        onWorkflowChange?.(newGraph);
        return newGraph;
      });
    }
  }, [onEdgesChange, onWorkflowChange]);

  // Add custom nodes change handler
  const handleNodesChange = useCallback((changes: any[]) => {
    // First apply the changes to ReactFlow's state
    onNodesChange(changes);

    // Then update our workflow graph for position changes
    const positionChanges = changes.filter(
      (change) => change.type === 'position' && change.position
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
        
        // Schedule the onWorkflowChange call for the next tick
        setTimeout(() => {
          onWorkflowChange?.(newGraph);
        }, 0);

        return newGraph;
      });
    }
  }, [onNodesChange, onWorkflowChange]);

  // Update state when initialWorkflowGraph changes
  useEffect(() => {
    setWorkflowGraph(initialWorkflowGraph);
    setNodes(convertToReactFlowNodes(initialWorkflowGraph.nodes));
    setEdges(convertToReactFlowEdges(initialWorkflowGraph.edges));
  }, [initialWorkflowGraph, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'workflowEdge',
      };
      setEdges((eds) => addEdge(edge, eds));
      
      // Update workflow graph with new connection
      setWorkflowGraph((prevGraph: Graph) => {
        const newGraph = {
          ...prevGraph,
          edges: [...prevGraph.edges, convertToWorkflowEdge(params)],
        };
        onWorkflowChange?.(newGraph);
        return newGraph;
      });
    },
    [setEdges, onWorkflowChange]
  );

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

  const handleNodeSelect = useCallback((template: NodeTemplate) => {
    if (!reactFlowInstance) return;

    const position = reactFlowInstance.project({
      x: Math.random() * 500,
      y: Math.random() * 500,
    });

    const newNode = template.createNode(position);
    
    // First update the nodes state
    setNodes((nds) => [...nds, ...convertToReactFlowNodes([newNode])]);
    
    // Then trigger the workflow graph update
    setWorkflowGraph((prevGraph: Graph) => {
      const newGraph = {
        ...prevGraph,
        nodes: [...prevGraph.nodes, newNode],
      };
      onWorkflowChange?.(newGraph);
      return newGraph;
    });
    
    setIsNodeSelectorOpen(false);
  }, [reactFlowInstance, setNodes, onWorkflowChange]);

  return (
    <div className="w-full h-full flex">
      <div className={`h-full rounded-xl border border-white overflow-hidden relative ${(selectedNode || selectedEdge) ? 'w-[calc(100%-320px)]' : 'w-full'}`}>
      <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Strict}
          connectionLineType={ConnectionLineType.SmoothStep}
          onInit={setReactFlowInstance}
          fitView
          className="bg-gray-100"
        >
          <Controls showInteractive={false} />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={12} 
            size={1} 
            color="#d4d4d4"
          />
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddNode();
            }}
            size="icon"
            className="fixed bottom-8 right-8 z-50 rounded-full shadow-lg absolute"
            title="Add Node"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </Button>
        </ReactFlow>
      </div>
      <div className={`w-80 ${!selectedNode && !selectedEdge && 'hidden'}`}>
        <WorkflowSidebar node={selectedNode} edge={selectedEdge} />
      </div>

      <NodeSelector
        open={isNodeSelectorOpen}
        onClose={() => setIsNodeSelectorOpen(false)}
        onSelect={handleNodeSelect}
      />
    </div>
  );
} 