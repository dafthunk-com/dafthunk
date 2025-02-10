import { NextRequest, NextResponse } from 'next/server';
import { graphs } from '../store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const graph = graphs.find((g) => g.id === params.id);
  
  if (!graph) {
    return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
  }

  return NextResponse.json(graph);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const index = graphs.findIndex((g) => g.id === params.id);
  
  if (index === -1) {
    return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
  }

  const updatedGraph = {
    ...graphs[index],
    ...body,
    id: params.id,
    updatedAt: new Date().toISOString(),
  };

  graphs[index] = updatedGraph;

  return NextResponse.json(updatedGraph);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const index = graphs.findIndex((g) => g.id === params.id);
  
  if (index === -1) {
    return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
  }

  graphs.splice(index, 1);

  return new NextResponse(null, { status: 204 });
} 