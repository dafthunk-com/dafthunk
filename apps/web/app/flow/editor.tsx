'use client';

import { useCallback, useState } from 'react';
import ReactFlow, {
  MiniMap,
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
import { WorkflowNode } from '@repo/ui/workflow-node';
import { Node, Edge, NodeType, Graph } from '@repo/workflow';
import { Sidebar } from './sidebar';
import 'reactflow/dist/style.css';

const nodeTypes = {
  workflowNode: WorkflowNode,
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
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceOutput,
    targetHandle: edge.targetInput,
    type: 'smoothstep',
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

interface EditorProps {
  initialWorkflowGraph: Graph;
  onWorkflowChange?: (graph: Graph) => void;
}

export function Editor({ initialWorkflowGraph, onWorkflowChange }: EditorProps) {
  const [workflowGraph, setWorkflowGraph] = useState<Graph>(initialWorkflowGraph);
  const [nodes, setNodes, onNodesChange] = useNodesState(convertToReactFlowNodes(workflowGraph.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertToReactFlowEdges(workflowGraph.connections));
  const [selectedNode, setSelectedNode] = useState<ReactFlowNode | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
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
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className={`w-full h-full flex`}>
      <div className={`h-full rounded-xl border border-white overflow-hidden ${selectedNode ? 'w-[calc(100%-320px)]' : 'w-full'}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Strict}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { stroke: '#999', strokeWidth: 1 },
            animated: false
          }}
          connectionLineStyle={{
            strokeWidth: 1,
            stroke: '#999'
          }}
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
      <Sidebar node={selectedNode} />
    </div>
  );
} 