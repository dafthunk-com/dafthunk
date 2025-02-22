import { Graph } from '@repo/workflow';

// In a real application, this would be replaced with a proper database
export const graphs: Graph[] = [];

// Helper functions for graph operations
export function findGraphById(id: string): Graph | undefined {
  return graphs.find(graph => graph.id === id);
}

export function updateGraph(id: string, updates: Partial<Graph>): Graph | undefined {
  const index = graphs.findIndex(graph => graph.id === id);
  if (index === -1) return undefined;

  const graph = graphs[index];
  graphs[index] = {
    ...graph,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return graphs[index];
}

export function deleteGraph(id: string): boolean {
  const index = graphs.findIndex(graph => graph.id === id);
  if (index === -1) return false;

  graphs.splice(index, 1);
  return true;
} 