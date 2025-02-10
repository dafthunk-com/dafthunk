import { Graph } from '@repo/workflow';

export interface StoredGraph extends Graph {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage for demonstration
// In a real app, this would be replaced with a database
export const graphs: StoredGraph[] = []; 