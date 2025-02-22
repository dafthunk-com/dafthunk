import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
  ConnectionLineType,
} from 'reactflow';
import { WorkflowNode as WorkflowNodeComponent } from './workflow-node';
import { WorkflowEdge as WorkflowEdgeComponent } from './workflow-edge';
import { Graph, ExecutionEvent } from '@/lib/types';
import { WorkflowSidebar } from './workflow-sidebar';
import 'reactflow/dist/style.css';
import { NodeSelector } from './node-selector';
import { Button } from "@/components/ui/button";
import { useWorkflowState } from './useWorkflowState';
import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { PlusIcon, MinusIcon } from 'lucide-react';
import { useReactFlow } from 'reactflow';

const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

const edgeTypes = {
  workflowEdge: WorkflowEdgeComponent,
};

interface WorkflowEditorProps {
  initialWorkflowGraph: Graph;
  onWorkflowChange?: (graph: Graph) => void;
}

export function WorkflowEditor({ initialWorkflowGraph, onWorkflowChange }: WorkflowEditorProps) {
  const { id } = useParams<{ id: string }>();
  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleAddNode,
    handleNodeSelect,
    updateNodeExecutionState,
    setReactFlowInstance,
    connectionValidationState,
  } = useWorkflowState({
    initialWorkflowGraph,
    onWorkflowChange,
  });

  const reactFlow = useReactFlow();
  
  const handleZoomIn = useCallback(() => {
    reactFlow.zoomIn();
  }, [reactFlow]);

  const handleZoomOut = useCallback(() => {
    reactFlow.zoomOut();
  }, [reactFlow]);

  const handleExecute = () => {
    // Reset all nodes to idle state
    nodes.forEach(node => {
      updateNodeExecutionState(node.id, 'idle');
    });

    const eventSource = new EventSource(`${process.env.REACT_APP_API_URL}/api/graphs/${id}/execute`);

    eventSource.onopen = () => {
      console.log('Execution started');
    };

    eventSource.onerror = (error) => {
      console.error('Execution error:', error);
      eventSource.close();
    };

    eventSource.addEventListener('node-start', (event) => {
      const data = JSON.parse(event.data) as ExecutionEvent;
      console.log('Node execution started:', data);
      if (data.type === 'node-start') {
        updateNodeExecutionState(data.nodeId, 'executing');
      }
    });

    eventSource.addEventListener('node-complete', (event) => {
      const data = JSON.parse(event.data) as ExecutionEvent;
      console.log('Node execution completed:', data);
      if (data.type === 'node-complete') {
        updateNodeExecutionState(data.nodeId, 'completed');
      }
    });

    eventSource.addEventListener('node-error', (event) => {
      const data = JSON.parse(event.data) as ExecutionEvent;
      console.error('Node execution error:', data);
      if (data.type === 'node-error') {
        updateNodeExecutionState(data.nodeId, 'error');
      }
    });

    eventSource.addEventListener('execution-complete', (event) => {
      const data = JSON.parse(event.data) as ExecutionEvent;
      console.log('Workflow execution completed:', data);
      eventSource.close();
    });
  };

  return (
    <div className="w-full h-full flex">
      <div className={`h-full rounded-xl overflow-hidden relative ${(selectedNode || selectedEdge) ? 'w-[calc(100%-320px)]' : 'w-full'}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
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
              handleAddNode();
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleExecute();
            }}
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
          <Button
            onClick={handleZoomIn}
            className="absolute bottom-24 right-4 z-50 rounded-full shadow-lg h-10 w-10 p-0"
            title="Zoom In"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleZoomOut}
            className="absolute bottom-36 right-4 z-50 rounded-full shadow-lg h-10 w-10 p-0"
            title="Zoom Out"
          >
            <MinusIcon className="h-4 w-4" />
          </Button>
        </ReactFlow>
      </div>

      {(selectedNode || selectedEdge) && (
        <div className="w-80">
          <WorkflowSidebar node={selectedNode} edge={selectedEdge} />
        </div>
      )}

      <NodeSelector
        open={isNodeSelectorOpen}
        onSelect={handleNodeSelect}
        onClose={() => setIsNodeSelectorOpen(false)}
      />
    </div>
  );
} 