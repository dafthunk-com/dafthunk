/// <reference types="@cloudflare/workers-types" />

import { createDatabase, type Env } from '../../../db';
import { eq } from 'drizzle-orm';
import { workflows } from '../../../db/schema';
import { Workflow, Node, Edge, ExecutionEvent } from '../../../src/lib/workflowTypes';

// Helper function to create an SSE event
function createEvent(event: {
  type: 'node-start' | 'node-complete' | 'node-error' | 'execution-complete' | 'execution-error';
  nodeId?: string;
  error?: string;
  timestamp: number;
}): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

// Helper function to simulate node execution
async function executeNode(node: Node): Promise<void> {
  // In a real implementation, this would execute the actual node logic
  // For now, we'll simulate execution with a delay
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Function to handle node execution and event emission
async function handleNodeExecution(
  node: Node,
  writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<void> {
  // Emit node start event
  await writer.write(createEvent({
    type: 'node-start',
    nodeId: node.id,
    timestamp: Date.now()
  }));

  try {
    await executeNode(node);
    // Emit node complete event
    await writer.write(createEvent({
      type: 'node-complete',
      nodeId: node.id,
      timestamp: Date.now()
    }));
  } catch (error) {
    // Emit node error event
    await writer.write(createEvent({
      type: 'node-error',
      nodeId: node.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }));
  }
}

// Function to execute the entire graph
async function executeGraph(
  graph: Workflow,
  writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<void> {
  try {
    // Execute each node in sequence
    for (const node of graph.nodes) {
      await handleNodeExecution(node, writer);
    }

    // Emit execution complete event
    await writer.write(createEvent({
      type: 'execution-complete',
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Graph execution error:', error);
    throw error;
  } finally {
    await writer.close();
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Only allow GET requests
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(context.request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 2];

    if (!id) {
      return new Response('Graph ID is required', { status: 400 });
    }

    const db = createDatabase(context.env.DB);
    const [graph] = await db.select().from(workflows).where(eq(workflows.id, id));

    if (!graph) {
      return new Response(
        JSON.stringify({ error: 'Graph not found' }),
        { 
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // The data field is already parsed by Drizzle ORM
    const graphData = graph.data as { nodes: Node[]; edges: Edge[] };
    const workflowGraph: Workflow = {
      id: graph.id,
      name: graph.name,
      nodes: graphData.nodes || [],
      edges: graphData.edges || []
    };

    // Create a TransformStream for SSE with Uint8Array chunks
    const { readable, writable } = new TransformStream<Uint8Array>();
    const writer = writable.getWriter();

    // Execute the graph in the background
    executeGraph(workflowGraph, writer).catch(async (error) => {
      console.error('Execution error:', error);
      await writer.write(createEvent({
        type: 'execution-error',
        nodeId: 'system',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }));
      await writer.close();
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error: unknown) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to execute graph' 
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
} 