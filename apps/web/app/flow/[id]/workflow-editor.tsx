'use client';

import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
  ConnectionLineType,
} from 'reactflow';
import { WorkflowNode as WorkflowNodeComponent } from './workflow-node';
import { WorkflowEdge as WorkflowEdgeComponent } from './workflow-edge';
import { Graph } from '@repo/workflow';
import { WorkflowSidebar } from './workflow-sidebar';
import 'reactflow/dist/style.css';
import { NodeSelector } from './node-selector';
import { Button } from "@repo/ui/button";
import { useWorkflowState } from './useWorkflowState';

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
  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    reactFlowInstance,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
    onNodesChange,
    onEdgesChange,
    onConnect,
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleAddNode,
    handleNodeSelect,
    setReactFlowInstance,
  } = useWorkflowState({
    initialWorkflowGraph,
    onWorkflowChange,
  });

  return (
    <div className="w-full h-full flex">
      <div className={`h-full rounded-xl overflow-hidden relative ${(selectedNode || selectedEdge) ? 'w-[calc(100%-320px)]' : 'w-full'}`}>
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
            className="absolute bottom-4 right-4 z-50 rounded-full shadow-lg"
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
              // Execute functionality will be implemented later
            }}
            size="icon"
            className="absolute top-4 right-4 z-50 rounded-full shadow-lg"
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