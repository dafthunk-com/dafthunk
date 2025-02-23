import { Graph } from '@/lib/workflowTypes';
import { API_BASE_URL } from '../config/api';

export const graphService = {
  // Get all graphs
  async getAll(): Promise<Graph[]> {
    const response = await fetch(`${API_BASE_URL}/workflows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch graphs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.graphs;
  },

  // Create a new graph
  async create(name: string): Promise<Graph> {
    const response = await fetch(`${API_BASE_URL}/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create graph: ${response.statusText}`);
    }

    return response.json();
  },

  // Load a graph by ID
  async load(id: string): Promise<Graph> {
    const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load graph: ${response.statusText}`);
    }

    return response.json();
  },

  // Save a graph
  async save(id: string, graph: Graph): Promise<Graph> {
    const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graph),
    });

    if (!response.ok) {
      throw new Error(`Failed to save graph: ${response.statusText}`);
    }

    return response.json();
  }
}; 