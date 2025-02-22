import { nodeTypes } from './types';

export interface Env {
  // Add your environment variables here
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function handleTypes(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  return new Response(JSON.stringify(nodeTypes), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

async function handleGraphs(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // TODO: Implement graphs endpoints
  return new Response(JSON.stringify({ message: 'Not implemented yet' }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    status: 501,
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      // Route handling
      if (url.pathname === '/types') {
        return handleTypes(request);
      } else if (url.pathname.startsWith('/graphs')) {
        return handleGraphs(request);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
}; 