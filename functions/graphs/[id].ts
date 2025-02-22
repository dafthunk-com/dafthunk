/// <reference types="@cloudflare/workers-types" />

import { findGraphById, updateGraph, deleteGraph } from '../store';
import { Graph } from '@repo/workflow';

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return new Response('Graph ID is required', { status: 400 });
  }

  if (context.request.method === 'GET') {
    const graph = findGraphById(id);
    
    if (!graph) {
      return new Response('Graph not found', { status: 404 });
    }

    return new Response(JSON.stringify(graph), {
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  if (context.request.method === 'PUT') {
    const body = await context.request.json();
    const updatedGraph = updateGraph(id, body);

    if (!updatedGraph) {
      return new Response('Graph not found', { status: 404 });
    }

    return new Response(JSON.stringify(updatedGraph), {
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  if (context.request.method === 'DELETE') {
    const deleted = deleteGraph(id);

    if (!deleted) {
      return new Response('Graph not found', { status: 404 });
    }

    return new Response(null, { status: 204 });
  }

  return new Response('Method not allowed', { status: 405 });
} 