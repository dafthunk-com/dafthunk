import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
  ConnectionLineType,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  OnConnectStart,
  OnConnectEnd,
  OnInit,
  ReactFlowInstance
} from 'reactflow';
import { WorkflowNode } from './workflow-node';
import { WorkflowEdge } from './workflow-edge';
import { WorkflowControls } from './workflow-controls';
import 'reactflow/dist/style.css';

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const edgeTypes = {
  workflowEdge: WorkflowEdge,
};

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onPaneClick: (event: React.MouseEvent) => void;
  onInit: OnInit;
  connectionValidationState: 'default' | 'valid' | 'invalid';
  onAddNode: (e: React.MouseEvent) => void;
  onExecute: (e: React.MouseEvent) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onInit,
  connectionValidationState,
  onAddNode,
  onExecute,
}: WorkflowCanvasProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionMode={ConnectionMode.Strict}
      connectionLineType={ConnectionLineType.SmoothStep}
      onInit={onInit}
      fitView
      className="bg-gray-100"
      connectionLineStyle={{
        stroke: connectionValidationState === 'default' ? '#d1d5db' : 
               connectionValidationState === 'valid' ? '#16a34a' : '#dc2626',
        strokeWidth: 1,
        strokeDasharray: '5 5',
      }}
    >
      <Controls showInteractive={false} />
      <Background 
        variant={BackgroundVariant.Dots} 
        gap={12} 
        size={1} 
        color="#d4d4d4"
      />
      <WorkflowControls onAddNode={onAddNode} onExecute={onExecute} />
    </ReactFlow>
  );
} 