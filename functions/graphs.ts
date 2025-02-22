/// <reference types="@cloudflare/workers-types" />

import { graphs } from './store';
import { Graph } from '@repo/workflow';

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
    const body = await context.request.json();
    
    const newGraph: Graph = {
      id: crypto.randomUUID(),
      name: body.name,
      nodes: body.nodes || [],
      edges: body.edges || [],
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