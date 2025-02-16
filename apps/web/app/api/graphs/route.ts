import { NextRequest, NextResponse } from 'next/server';
import { graphs } from './store';
import { Graph } from '@repo/workflow';

export async function GET() {
  return NextResponse.json({
    graphs: graphs.map(({ id, name, createdAt, updatedAt }) => ({
      id,
      name,
      createdAt,
      updatedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const newGraph: Graph = {
    id: crypto.randomUUID(),
    name: body.name,
    nodes: body.nodes || [],
    edges: body.edges || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  graphs.push(newGraph);

  return NextResponse.json(newGraph, { status: 201 });
} 