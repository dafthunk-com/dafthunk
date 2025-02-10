import { NextRequest, NextResponse } from 'next/server';
import { graphs } from '../store';
import { Graph } from '@repo/workflow';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  // Await the params before using them
  const { id } = await context.params;
  const graph = graphs.find((g) => g.id === id);

  if (!graph) {
    return NextResponse.json(
      { error: 'Graph not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(graph);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await context.params;
  const body = await request.json() as Partial<Graph>;
  const index = graphs.findIndex((g) => g.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Graph not found' },
      { status: 404 }
    );
  }

  const existingGraph = graphs[index];
  const updatedGraph: Graph = {
    ...existingGraph,
    ...body,
    id,
    name: body.name ?? existingGraph.name,
    nodes: body.nodes ?? existingGraph.nodes,
    edges: body.edges ?? existingGraph.edges,
    createdAt: existingGraph.createdAt,
    updatedAt: new Date().toISOString(),
  };

  graphs[index] = updatedGraph;
  return NextResponse.json(updatedGraph);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await context.params;
  const index = graphs.findIndex((g) => g.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Graph not found' },
      { status: 404 }
    );
  }

  graphs.splice(index, 1);
  return new NextResponse(null, { status: 204 });
}
