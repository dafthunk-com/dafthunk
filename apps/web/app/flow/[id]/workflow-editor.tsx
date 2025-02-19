'use client';

import { Graph } from '@repo/workflow';
import { WorkflowSidebar } from './workflow-sidebar';
import { NodeSelector } from './node-selector';
import { useWorkflowState } from './useWorkflowState';
import { useWorkflowExecution } from './useWorkflowExecution';
import { WorkflowCanvas } from './workflow-canvas';
import { useParams } from 'next/navigation';

interface WorkflowEditorProps {
  initialWorkflowGraph: Graph;
  onWorkflowChange?: (graph: Graph) => void;
}

export function WorkflowEditor({ initialWorkflowGraph, onWorkflowChange }: WorkflowEditorProps) {
  const params = useParams();
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

  const { handleExecute } = useWorkflowExecution({
    nodes,
    updateNodeExecutionState,
    workflowId: params.id as string,
  });

  return (
    <div className="w-full h-full flex">
      <div className={`h-full rounded-xl overflow-hidden relative ${
        (selectedNode || selectedEdge) ? 'w-[calc(100%-20rem)]' : 'w-full'
      }`}>
        <WorkflowCanvas
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
          onInit={setReactFlowInstance}
          connectionValidationState={connectionValidationState}
          onAddNode={handleAddNode}
          onExecute={handleExecute}
        />
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