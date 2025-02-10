import { NextResponse } from 'next/server';

interface Parameter {
  name: string;
  type: string;
}

interface NodeType {
  id: string;
  name: string;
  type: string;
  inputs: Parameter[];
  outputs: Parameter[];
  description: string;
  category: string;
  icon: string;
}

const nodeTypes: NodeType[] = [
  {
    id: 'text-processor',
    name: 'Text Processor',
    type: 'text-processor',
    description: 'Process and transform text data',
    category: 'Processing',
    icon: 'TextProcessorIcon',
    inputs: [
      { name: 'Text Input', type: 'string' }
    ],
    outputs: [
      { name: 'Processed Text', type: 'string' }
    ]
  },
  {
    id: 'llm-model',
    name: 'LLM Model',
    type: 'llm-model',
    description: 'Large Language Model for text generation',
    category: 'AI Models', 
    icon: 'LLMModelIcon',
    inputs: [
      { name: 'Prompt', type: 'string' },
      { name: 'Temperature', type: 'number' }
    ],
    outputs: [
      { name: 'Generated Text', type: 'string' }
    ]
  },
  {
    id: 'text-splitter',
    name: 'Text Splitter',
    type: 'text-splitter',
    description: 'Split text into chunks',
    category: 'Processing',
    icon: 'TextSplitterIcon',
    inputs: [
      { name: 'Text Input', type: 'string' },
      { name: 'Chunk Size', type: 'number' }
    ],
    outputs: [
      { name: 'Text Chunks', type: 'string[]' }
    ]
  },
  {
    id: 'text-joiner',
    name: 'Text Joiner',
    type: 'text-joiner',
    description: 'Join multiple text inputs into one',
    category: 'Processing',
    icon: 'TextJoinerIcon', 
    inputs: [
      { name: 'Text Inputs', type: 'string[]' },
      { name: 'Separator', type: 'string' }
    ],
    outputs: [
      { name: 'Joined Text', type: 'string' }
    ]
  },
  {
    id: 'sentiment-analyzer',
    name: 'Sentiment Analyzer',
    type: 'sentiment-analyzer',
    description: 'Analyze text sentiment',
    category: 'AI Models',
    icon: 'SentimentIcon',
    inputs: [
      { name: 'Text Input', type: 'string' }
    ],
    outputs: [
      { name: 'Sentiment Score', type: 'number' },
      { name: 'Sentiment Label', type: 'string' }
    ]
  }
];

export async function GET() {
  return NextResponse.json(nodeTypes);
}