/// <reference types="@cloudflare/workers-types" />

import { createDatabase, type Env } from '../../db';
import { eq } from 'drizzle-orm';
import { graphs } from '../../db/schema';
import { Graph, Node, Edge } from '../../src/lib/workflowTypes';

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDatabase(context.env.DB);
  const url = new URL(context.request.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return new Response('Graph ID is required', { status: 400 });
  }

  if (context.request.method === 'GET') {
    const [graph] = await db.select().from(graphs).where(eq(graphs.id, id));
    
    if (!graph) {
      return new Response('Graph not found', { status: 404 });
    }

    const graphData = graph.data as { nodes: Node[]; edges: Edge[] };

    return new Response(JSON.stringify({
      id: graph.id,
      name: graph.name,
      createdAt: graph.createdAt,
      updatedAt: graph.updatedAt,
      nodes: graphData.nodes || [],
      edges: graphData.edges || [],
    }), {
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  if (context.request.method === 'PUT') {
    const body = await context.request.json() as unknown;
    
    if (typeof body !== 'object' || body === null) {
      return new Response('Invalid request body', { status: 400 });
    }

    const data = body as any;
    const now = new Date();

    const [updatedGraph] = await db
      .update(graphs)
      .set({
        name: data.name,
        data: {
          nodes: Array.isArray(data.nodes) ? data.nodes : [],
          edges: Array.isArray(data.edges) ? data.edges : [],
        },
        updatedAt: now,
      })
      .where(eq(graphs.id, id))
      .returning();

    if (!updatedGraph) {
      return new Response('Graph not found', { status: 404 });
    }

    const graphData = updatedGraph.data as { nodes: Node[]; edges: Edge[] };

    return new Response(JSON.stringify({
      id: updatedGraph.id,
      name: updatedGraph.name,
      createdAt: updatedGraph.createdAt,
      updatedAt: updatedGraph.updatedAt,
      nodes: graphData.nodes || [],
      edges: graphData.edges || [],
    }), {
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  if (context.request.method === 'DELETE') {
    const [deletedGraph] = await db
      .delete(graphs)
      .where(eq(graphs.id, id))
      .returning();

    if (!deletedGraph) {
      return new Response('Graph not found', { status: 404 });
    }

    return new Response(null, { status: 204 });
  }

  return new Response('Method not allowed', { status: 405 });
} 