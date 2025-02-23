import { Node, NodeType } from '@lib/workflowTypes';
import { Node as ReactFlowNode, XYPosition } from 'reactflow';

export type NodeExecutionState = 'idle' | 'executing' | 'completed' | 'error';

export interface WorkflowNodeType extends NodeType {
  createNode: (position: { x: number; y: number }) => Node;
  description: string;
  category: string;
  icon: string;
}

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

const createDefaultNode = (
  type: string,
  name: string,
  position: { x: number; y: number },
  inputs: { name: string; type: string }[],
  outputs: { name: string; type: string }[],
): Node => ({
  id: `node-${Date.now()}`,
  type,
  name,
  position,
  inputs,
  outputs,
});

const nodeCreators: Record<string, WorkflowNodeType> = {
  'text-processor': {
    id: 'text-processor',
    type: 'Processor',
    name: 'Text Processor',
    description: 'Process text input',
    category: 'Processing',
    icon: 'TextProcessorIcon',
    inputs: [{ name: 'text', type: 'string' }],
    outputs: [{ name: 'processed', type: 'string' }],
    createNode: (position) => createDefaultNode(
      'Processor',
      'Text Processor',
      position,
      [{ name: 'text', type: 'string' }],
      [{ name: 'processed', type: 'string' }],
    ),
  },
  'llm-model': {
    id: 'llm-model',
    type: 'AIModel',
    name: 'LLM Model',
    description: 'Large Language Model',
    category: 'AI',
    icon: 'LLMModelIcon',
    inputs: [
      { name: 'prompt', type: 'string' },
      { name: 'temperature', type: 'number' },
    ],
    outputs: [{ name: 'completion', type: 'string' }],
    createNode: (position) => createDefaultNode(
      'AIModel',
      'LLM Model',
      position,
      [
        { name: 'prompt', type: 'string' },
        { name: 'temperature', type: 'number' },
      ],
      [{ name: 'completion', type: 'string' }],
    ),
  },
  's3-storage': {
    id: 's3-storage',
    type: 'Storage',
    name: 'S3 Storage',
    description: 'AWS S3 Storage',
    category: 'Storage',
    icon: 'StorageIcon',
    inputs: [
      { name: 'data', type: 'any' },
      { name: 'path', type: 'string' },
    ],
    outputs: [{ name: 'url', type: 'string' }],
    createNode: (position) => createDefaultNode(
      'Storage',
      'S3 Storage',
      position,
      [
        { name: 'data', type: 'any' },
        { name: 'path', type: 'string' },
      ],
      [{ name: 'url', type: 'string' }],
    ),
  },
  'file-input': {
    id: 'file-input',
    type: 'Input',
    name: 'File Input',
    description: 'File Input Node',
    category: 'Input',
    icon: 'FileInputIcon',
    inputs: [],
    outputs: [
      { name: 'content', type: 'string' },
      { name: 'metadata', type: 'object' },
    ],
    createNode: (position) => createDefaultNode(
      'Input',
      'File Input',
      position,
      [],
      [
        { name: 'content', type: 'string' },
        { name: 'metadata', type: 'object' },
      ],
    ),
  },
};

export async function fetchNodeTypes(): Promise<WorkflowNodeType[]> {
  try {
    const response = await fetch('/types');
    if (!response.ok) {
      throw new Error(`Failed to fetch node types: ${response.statusText}`);
    }
    const serverNodeTypes: NodeType[] = await response.json();
    
    return serverNodeTypes.map(nodeType => {
      const existingCreator = nodeCreators[nodeType.id];
      if (existingCreator) {
        return {
          ...nodeType,
          ...existingCreator,
        };
      }
      
      return {
        ...nodeType,
        createNode: (position) => createDefaultNode(
          nodeType.type,
          nodeType.name,
          position,
          nodeType.inputs || [],
          nodeType.outputs || [],
        ),
      } as WorkflowNodeType;
    });
  } catch (error) {
    console.error('Error fetching node types:', error);
    throw new Error(`Failed to load node types: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 