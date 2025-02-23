/// <reference types="@cloudflare/workers-types" />

import { createDatabase, type Env } from '../db';
import { eq } from 'drizzle-orm';
import { workflows, type NewGraph } from '../db/schema';

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDatabase(context.env.DB);

  if (context.request.method === 'GET') {
    const allGraphs = await db.select({
      id: workflows.id,
      name: workflows.name,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
    }).from(workflows);

    return new Response(JSON.stringify({ graphs: allGraphs }), {
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  if (context.request.method === 'POST') {
    const body = await context.request.json() as unknown;
    
    if (typeof body !== 'object' || body === null) {
      return new Response('Invalid request body', { status: 400 });
    }

    const data = body as any;
    const now = new Date();
    
    const newGraphData: NewGraph = {
      id: crypto.randomUUID(),
      name: data.name || 'Untitled Graph',
      data: JSON.stringify({
        nodes: Array.isArray(data.nodes) ? data.nodes : [],
        edges: Array.isArray(data.edges) ? data.edges : [],
      }),
      createdAt: now,
      updatedAt: now,
    };

    const [newGraph] = await db.insert(workflows).values(newGraphData).returning();
    const graphData = JSON.parse(newGraph.data as string);

    return new Response(JSON.stringify({
      id: newGraph.id,
      name: newGraph.name,
      createdAt: newGraph.createdAt,
      updatedAt: newGraph.updatedAt,
      nodes: graphData.nodes,
      edges: graphData.edges,
    }), {
      status: 201,
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  return new Response('Method not allowed', { status: 405 });
} 