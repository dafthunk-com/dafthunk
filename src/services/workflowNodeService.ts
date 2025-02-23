export interface NodeType {
  id: string;
  type: string;
  name: string;
  description: string;
  category: string;
  inputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
}

export interface Node {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  inputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
  error?: string;
}

import { Node as ReactFlowNode, XYPosition } from 'reactflow';
import { API_BASE_URL } from '../config/api';

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

  createNode(template: NodeType, position: XYPosition): Node {
    return {
      id: `node-${Date.now()}`,
      type: template.type,
      name: template.name,
      position,
      inputs: template.inputs,
      outputs: template.outputs,
    };
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

export async function fetchNodeTypes(): Promise<NodeType[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/types`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch node types: ${response.statusText}`);
    }
    
    const nodeTypes: NodeType[] = await response.json();
    return nodeTypes;
  } catch (error) {
    console.error('Error fetching node types:', error);
    throw new Error(`Failed to load node types: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 