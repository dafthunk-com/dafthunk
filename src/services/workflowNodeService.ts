import { Node } from '@lib/workflowTypes';
import { Node as ReactFlowNode, XYPosition } from 'reactflow';
import { WorkflowNodeType } from '@/components/editor/workflow-templates';

export type NodeExecutionState = 'idle' | 'executing' | 'completed' | 'error';

export const workflowNodeService = {
  convertToReactFlowNodes(nodes: Node[]): ReactFlowNode[] {
    return nodes.map(node => ({
      id: node.id,
      type: 'workflowNode',
      position: node.position,
      data: {
        name: node.name,
        inputs: node.inputs,
        outputs: node.outputs,
        error: node.error,
        executionState: 'idle' as NodeExecutionState,
      },
    }));
  },

  createNode(template: WorkflowNodeType, position: XYPosition): Node {
    return template.createNode(position);
  },

  updateNodeExecutionState(nodes: ReactFlowNode[], nodeId: string, state: NodeExecutionState): ReactFlowNode[] {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            executionState: state,
          },
        };
      }
      return node;
    });
  }
}; 