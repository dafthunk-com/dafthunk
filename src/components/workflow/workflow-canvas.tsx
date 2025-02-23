import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
  ConnectionLineType,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  NodeChange,
  EdgeChange,
  OnConnectStart,
  OnConnectEnd,
  OnConnect,
  ReactFlowInstance,
} from 'reactflow';
import { Button } from "@/components/ui/button";
import { WorkflowNode } from './workflow-node';
import { WorkflowEdge } from './workflow-edge';
import 'reactflow/dist/style.css';

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const edgeTypes = {
  workflowEdge: WorkflowEdge,
};

const connectionLineOptions = {
  type: ConnectionLineType.SmoothStep,
  style: {
    strokeWidth: 1,
    stroke: '#d1d5db',
  },
};

interface WorkflowCanvasProps {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  connectionValidationState: 'default' | 'valid' | 'invalid';
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onNodeClick: (event: React.MouseEvent, node: ReactFlowNode) => void;
  onEdgeClick: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  onPaneClick: () => void;
  onInit: (instance: ReactFlowInstance) => void;
  onAddNode: () => void;
  onExecute: (e: React.MouseEvent) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  connectionValidationState,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onInit,
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
      connectionRadius={8}
      defaultEdgeOptions={connectionLineOptions}
      onInit={onInit}
      fitView
      className="bg-gray-100"
      connectionLineStyle={{
        stroke: connectionValidationState === 'default' ? '#d1d5db' : 
               connectionValidationState === 'valid' ? '#16a34a' : '#dc2626',
        strokeWidth: 1,
      }}
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
          onAddNode();
        }}
        className="absolute bottom-4 right-4 z-50 rounded-full shadow-lg h-10 w-10 p-0"
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
      <Button
        onClick={onExecute}
        className="absolute top-4 right-4 z-50 rounded-full shadow-lg h-10 w-10 p-0"
        title="Execute Workflow"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />
        </svg>
      </Button>
    </ReactFlow>
  );
} 