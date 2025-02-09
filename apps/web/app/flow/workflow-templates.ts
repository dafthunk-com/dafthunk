import { Node } from '@repo/workflow';

export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Processing' | 'AI Models' | 'Storage' | 'Input/Output';
  icon: string;
  createNode: (position: { x: number; y: number }) => Node;
}

export const nodeTemplates: NodeTemplate[] = [
  {
    id: 'text-processor',
    name: 'Text Processor',
    description: 'Process and transform text data',
    category: 'Processing',
    icon: 'M5 15l7-7 7 7',
    createNode: (position) => ({
      id: `node-${Date.now()}`,
      type: 'Processor',
      name: 'Text Processor',
      position,
      inputs: [
        { name: 'text', type: 'string' },
      ],
      outputs: [
        { name: 'processed', type: 'string' },
      ],
    }),
  },
  {
    id: 'llm-model',
    name: 'LLM Model',
    description: 'Large Language Model for text generation',
    category: 'AI Models',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    createNode: (position) => ({
      id: `node-${Date.now()}`,
      type: 'AIModel',
      name: 'LLM Model',
      position,
      inputs: [
        { name: 'prompt', type: 'string' },
        { name: 'temperature', type: 'number' },
      ],
      outputs: [
        { name: 'completion', type: 'string' },
      ],
    }),
  },
  {
    id: 's3-storage',
    name: 'S3 Storage',
    description: 'Store and retrieve data from S3',
    category: 'Storage',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
    createNode: (position) => ({
      id: `node-${Date.now()}`,
      type: 'Storage',
      name: 'S3 Storage',
      position,
      inputs: [
        { name: 'data', type: 'any' },
        { name: 'path', type: 'string' },
      ],
      outputs: [
        { name: 'url', type: 'string' },
      ],
    }),
  },
  {
    id: 'file-input',
    name: 'File Input',
    description: 'Read data from files',
    category: 'Input/Output',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    createNode: (position) => ({
      id: `node-${Date.now()}`,
      type: 'Input',
      name: 'File Input',
      position,
      inputs: [],
      outputs: [
        { name: 'content', type: 'string' },
        { name: 'metadata', type: 'object' },
      ],
    }),
  },
]; 