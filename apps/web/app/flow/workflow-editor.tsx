'use client';

import { useCallback, useState } from 'react';
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
} from 'reactflow';
import { WorkflowNode as WorkflowNodeComponent } from './workflow-node';
import { WorkflowEdge as WorkflowEdgeComponent } from './workflow-edge';
import { Node, Edge, Graph } from '@repo/workflow';
import { WorkflowSidebar } from './workflow-sidebar';
import 'reactflow/dist/style.css';

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
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertToReactFlowEdges(workflowGraph.connections));
  const [selectedNode, setSelectedNode] = useState<ReactFlowNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ReactFlowEdge | null>(null);

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
          connections: [...prevGraph.connections, convertToWorkflowEdge(params)],
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

  return (
    <div className="w-full h-full flex">
      <div className={`h-full rounded-xl border border-white overflow-hidden ${(selectedNode || selectedEdge) ? 'w-[calc(100%-320px)]' : 'w-full'}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Strict}
          connectionLineType={ConnectionLineType.SmoothStep}
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
        </ReactFlow>
      </div>
      <div className={`w-80 ${!selectedNode && !selectedEdge && 'hidden'}`}>
        <WorkflowSidebar node={selectedNode} edge={selectedEdge} />
      </div>
    </div>
  );
} 