'use client';

import { useCallback } from 'react';
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

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  return (
    <div className="w-screen h-screen fixed top-0 left-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
        className="bg-gray-50"
      >
        <Controls showInteractive={false} />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={12} 
          size={1} 
          color="#e5e5e5"
        />
      </ReactFlow>
    </div>
  );
} 