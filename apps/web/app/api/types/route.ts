import { NextResponse } from 'next/server';

interface NodeType {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

const nodeTypes: NodeType[] = [
  {
    id: 'text-processor',
    name: 'Text Processor',
    description: 'Process and transform text data',
    category: 'Processing',
    icon: 'TextProcessorIcon',
  },
  {
    id: 'llm-model',
    name: 'LLM Model',
    description: 'Large Language Model for text generation',
    category: 'AI Models',
    icon: 'LLMModelIcon',
  },
];

export async function GET() {
  return NextResponse.json(nodeTypes);
} 