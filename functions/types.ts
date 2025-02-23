/// <reference types="@cloudflare/workers-types" />
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { nodeTypes as nodeTypesTable, type NewNodeType } from './db/schema';

/**
 * Available node types in the system
 */
export const nodeTypes: NewNodeType[] = [
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

// Default node types that will be used to initialize the database
const defaultNodeTypes: NewNodeType[] = [
  {
    id: 'text-processor',
    name: 'Text Processor',
    type: 'text-processor',
    description: 'Process and transform text data',
    category: 'Processing',
    icon: 'TextProcessorIcon',
    inputs: JSON.stringify([
      { name: 'Text Input', type: 'string' }
    ]),
    outputs: JSON.stringify([
      { name: 'Processed Text', type: 'string' }
    ])
  },
  {
    id: 'llm-model',
    name: 'LLM Model',
    type: 'llm-model',
    description: 'Large Language Model for text generation',
    category: 'AI Models', 
    icon: 'LLMModelIcon',
    inputs: JSON.stringify([
      { name: 'Prompt', type: 'string' },
      { name: 'Temperature', type: 'number' }
    ]),
    outputs: JSON.stringify([
      { name: 'Generated Text', type: 'string' }
    ])
  },
  {
    id: 'text-splitter',
    name: 'Text Splitter',
    type: 'text-splitter',
    description: 'Split text into chunks',
    category: 'Processing',
    icon: 'TextSplitterIcon',
    inputs: JSON.stringify([
      { name: 'Text Input', type: 'string' },
      { name: 'Chunk Size', type: 'number' }
    ]),
    outputs: JSON.stringify([
      { name: 'Text Chunks', type: 'string[]' }
    ])
  },
  {
    id: 'text-joiner',
    name: 'Text Joiner',
    type: 'text-joiner',
    description: 'Join multiple text inputs into one',
    category: 'Processing',
    icon: 'TextJoinerIcon', 
    inputs: JSON.stringify([
      { name: 'Text Inputs', type: 'string[]' },
      { name: 'Separator', type: 'string' }
    ]),
    outputs: JSON.stringify([
      { name: 'Joined Text', type: 'string' }
    ])
  },
  {
    id: 'sentiment-analyzer',
    name: 'Sentiment Analyzer',
    type: 'sentiment-analyzer',
    description: 'Analyze text sentiment',
    category: 'AI Models',
    icon: 'SentimentIcon',
    inputs: JSON.stringify([
      { name: 'Text Input', type: 'string' }
    ]),
    outputs: JSON.stringify([
      { name: 'Sentiment Score', type: 'number' },
      { name: 'Sentiment Label', type: 'string' }
    ])
  }
];

export const onRequest: PagesFunction<{ DB: D1Database }> = async (context) => {
  const db = drizzle(context.env.DB);
  
  // Check if we need to initialize the database
  const existingTypes = await db.select().from(nodeTypesTable);
  
  if (existingTypes.length === 0) {
    // Initialize with default node types
    for (const nodeType of defaultNodeTypes) {
      await db.insert(nodeTypesTable).values(nodeType);
    }
  }
  
  // Fetch all node types and parse JSON fields
  const types = await db.select().from(nodeTypesTable);
  const parsedTypes = types.map(type => ({
    ...type,
    inputs: JSON.parse(type.inputs as string),
    outputs: JSON.parse(type.outputs as string)
  }));
  
  return new Response(JSON.stringify(parsedTypes), {
    headers: {
      'content-type': 'application/json',
    },
  });
} 