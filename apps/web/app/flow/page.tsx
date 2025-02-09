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
import 'reactflow/dist/style.css';

interface SidebarProps {
  node: ReactFlowNode | null;
}

const Sidebar = ({ node }: SidebarProps) => {
  if (!node) return null;

  return (
    <div className={`fixed right-0 top-0 h-screen w-80 bg-white transform ${node ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">{node.data.name}</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Inputs</h3>
            <div className="space-y-2">
              {node.data.inputs.map((input: { name: string; type: string }, index: number) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="text-sm">{input.name}</span>
                  <span className="text-xs text-gray-500">{input.type}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Outputs</h3>
            <div className="space-y-2">
              {node.data.outputs.map((output: { name: string; type: string }, index: number) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="text-sm">{output.name}</span>
                  <span className="text-xs text-gray-500">{output.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const initialWorkflowGraph: Graph = {
  nodes: [
    {
      id: '1',
      name: 'Addition',
      type: 'Processor',
      position: { x: 250, y: 25 },
      inputs: [
        { name: 'A', type: 'number' },
        { name: 'B', type: 'number' },
      ],
      outputs: [
        { name: 'Output', type: 'number' },
      ],
      error: null,
    },
    {
      id: '2',
      name: 'Transform',
      type: 'Processor',
      position: { x: 250, y: 200 },
      inputs: [
        { name: 'data', type: 'number' },
      ],
      outputs: [
        { name: 'result', type: 'string' },
      ],
      error: null,
    },
  ],
  connections: [
    { 
      source: '1',
      target: '2',
      sourceOutput: 'Output',
      targetInput: 'data'
    },
  ],
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

export default function FlowPage() {
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
      setWorkflowGraph((prevGraph: Graph) => ({
        ...prevGraph,
        connections: [...prevGraph.connections, convertToWorkflowEdge(params)],
      }));
    },
    [setEdges]
  );

  const handleNodeClick = useCallback((event: React.MouseEvent, node: ReactFlowNode) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className={`w-screen h-screen fixed top-0 left-0 p-2 ${selectedNode ? 'pr-80' : ''}`}>
      <div className={`w-full h-full rounded-xl border border-white overflow-hidden `}>
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
        <Sidebar node={selectedNode} />
      </div>
    </div>
  );
} 