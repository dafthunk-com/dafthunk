'use client';

import { Graph } from '@circuit/workflow';
import { Editor } from './editor';

const graph: Graph = {
  nodes: [
    {
      id: '1',
      name: 'Addition',
      type: 'Processor',
      position: { x: 250, y: 25 },
      inputs: [
        { name: 'A', type: 'number' },
        { name: 'B', type: 'number' },
      ],
      outputs: [
        { name: 'Output', type: 'number' },
      ],
      error: null,
    },
    {
      id: '2',
      name: 'Transform',
      type: 'Processor',
      position: { x: 250, y: 200 },
      inputs: [
        { name: 'data', type: 'number' },
      ],
      outputs: [
        { name: 'result', type: 'string' },
      ],
      error: null,
    },
  ],
  connections: [
    { 
      source: '1',
      target: '2',
      sourceOutput: 'Output',
      targetInput: 'data'
    },
  ],
};

export default function FlowPage() {
  return (
    <div className="w-screen h-screen fixed top-0 left-0 p-2">
      <Editor initialWorkflowGraph={graph} />
    </div>
  );
} 