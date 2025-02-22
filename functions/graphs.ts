/// <reference types="@cloudflare/workers-types" />

import { graphs } from './store';
import { Graph } from '../src/lib/types';

export const onRequest: PagesFunction = async (context) => {
  if (context.request.method === 'GET') {
    return new Response(JSON.stringify({
      graphs: graphs.map(({ id, name, createdAt, updatedAt }) => ({
        id,
        name,
        createdAt,
        updatedAt,
      })),
    }), {
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
    const newGraph: Graph = {
      id: crypto.randomUUID(),
      name: data.name || 'Untitled Graph',
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    graphs.push(newGraph);

    return new Response(JSON.stringify(newGraph), {
      status: 201,
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  return new Response('Method not allowed', { status: 405 });
} 