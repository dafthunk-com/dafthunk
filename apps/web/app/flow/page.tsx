'use client';

import { useCallback, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  ConnectionMode,
  ConnectionLineType,
} from 'reactflow';
import { WorkflowNode } from '@repo/ui/workflow-node';
import 'reactflow/dist/style.css';

interface SidebarProps {
  node: Node | null;
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

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'workflowNode',
    data: { 
      name: 'Addition',
      inputs: [
        { name: 'A', type: 'number' },
        { name: 'B', type: 'number' },
      ],
      outputs: [
        { name: 'Output', type: 'number' },
      ]
    },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    type: 'workflowNode',
    data: { 
      name: 'Transform',
      inputs: [
        { name: 'data', type: 'number' },
      ],
      outputs: [
        { name: 'result', type: 'string' },
      ]
    },
    position: { x: 250, y: 200 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', sourceHandle: 'Output', targetHandle: 'data', type: 'smoothstep' },
];

export default function FlowPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
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