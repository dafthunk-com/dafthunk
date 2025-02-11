import { NextRequest } from 'next/server';
import { graphs } from '../../store';
import { Graph, Node, ExecutionEvent } from '@repo/workflow';

// Helper function to create an execution event
function createEvent(event: ExecutionEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
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
  controller: ReadableStreamDefaultController
): Promise<void> {
  // Emit node start event
  controller.enqueue(createEvent({
    type: 'node-start',
    nodeId: node.id,
    timestamp: new Date().toISOString()
  }));

  try {
    await executeNode(node);
    // Emit node complete event
    controller.enqueue(createEvent({
      type: 'node-complete',
      nodeId: node.id,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    // Emit node error event
    controller.enqueue(createEvent({
      type: 'node-error',
      nodeId: node.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }));
  }
}

// Function to execute the entire graph
async function executeGraph(
  graph: Graph,
  controller: ReadableStreamDefaultController
): Promise<void> {
  try {
    // Execute each node in sequence
    for (const node of graph.nodes) {
      await handleNodeExecution(node, controller);
    }

    // Emit execution complete event
    controller.enqueue(createEvent({
      type: 'execution-complete',
      timestamp: new Date().toISOString()
    }));

    controller.close();
  } catch (error) {
    controller.error(error);
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await context.params;
  const graph = graphs.find((g) => g.id === id);

  // debug graph on server
  console.log(graphs);

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

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      await executeGraph(graph, controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    }
  });
} 