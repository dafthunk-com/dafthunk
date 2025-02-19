import { useCallback } from 'react';
import { Node } from 'reactflow';
import { ExecutionEvent } from '@repo/workflow';

type NodeExecutionState = 'idle' | 'executing' | 'completed' | 'error';

interface UseWorkflowExecutionProps {
  nodes: Node[];
  updateNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
  workflowId: string;
}

export function useWorkflowExecution({ 
  nodes, 
  updateNodeExecutionState, 
  workflowId 
}: UseWorkflowExecutionProps) {
  const handleExecute = useCallback(() => {
    // Reset all nodes to idle state
    nodes.forEach(node => {
      updateNodeExecutionState(node.id, 'idle');
    });

    const eventSource = new EventSource(`/api/graphs/${workflowId}/execute`);

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
  }, [nodes, updateNodeExecutionState, workflowId]);

  return { handleExecute };
} 