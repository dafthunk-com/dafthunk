'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Graph, Node, Edge } from '@/lib/types';
import { WorkflowEditor } from './workflow-editor';

// Default empty graph structure
const emptyGraph: Graph = {
    id: '',
    name: 'New Workflow',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

// API client function to load a graph
const loadGraph = async (id: string): Promise<Graph> => {
  const response = await fetch(`/api/graphs/${id}`);
  if (!response.ok) {
    throw new Error(
      `Failed to load graph: ${response.status} ${response.statusText}`
    );
  }
  const data = await response.json();
  console.log('API Response:', data);
  
  // Validate and filter nodes and connections
  const validNodes = Array.isArray(data.nodes) 
    ? data.nodes.filter(isValidNode)
    : [];
  
  // Check both connections and edges fields since the API might use either
  const connections = data.connections || data.edges || [];
  const validConnections = Array.isArray(connections)
    ? connections.filter(isValidEdge)
    : [];

  const graph = {
    id: data.id || id,
    name: data.name || 'Untitled Workflow',
    nodes: validNodes,
    edges: validConnections,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
  console.log('Processed Graph:', graph);
  return graph;
};

// Validate node structure
const isValidNode = (node: unknown): node is Node => {
  return (
    node !== null &&
    typeof node === 'object' &&
    'id' in node &&
    'name' in node &&
    'type' in node &&
    'inputs' in node &&
    'outputs' in node &&
    'position' in node &&
    node.position !== null &&
    typeof node.position === 'object' &&
    'x' in node.position &&
    'y' in node.position &&
    typeof node.position.x === 'number' &&
    typeof node.position.y === 'number'
  );
};

// Validate edge structure
const isValidEdge = (edge: unknown): edge is Edge => {
  return (
    edge !== null &&
    typeof edge === 'object' &&
    'source' in edge &&
    'target' in edge &&
    'sourceOutput' in edge &&
    'targetInput' in edge &&
    typeof edge.source === 'string' &&
    typeof edge.target === 'string' &&
    typeof edge.sourceOutput === 'string' &&
    typeof edge.targetInput === 'string'
  );
};

// API client function to save a graph
const saveGraph = async (id: string, graph: Graph): Promise<void> => {
  const response = await fetch(`/api/graphs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nodes: graph.nodes,
      edges: graph.edges,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save graph: ${response.status} ${response.statusText}`);
  }
};

// Debounce utility function
const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [graph, setGraph] = useState<Graph>(emptyGraph);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const graphData = await loadGraph(id as string);
        console.log('Setting graph state:', graphData);
        setGraph(graphData);
      } catch (err) {
        console.error('Error loading graph:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setGraph(emptyGraph);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      console.log('Fetching graph with ID:', id);
      fetchGraph();
    } else {
      setError('No graph ID provided');
      setIsLoading(false);
    }
  }, [id]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (graphToSave: Graph) => {
      if (!id) return;
      
      try {
        setIsSaving(true);
        await saveGraph(id as string, graphToSave);
        console.log('Graph saved successfully');
      } catch (err) {
        console.error('Error saving graph:', err);
        setError(err instanceof Error ? err.message : 'Failed to save graph');
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [id]
  );

  // Handle graph changes
  const handleGraphChange = useCallback((updatedGraph: Graph) => {
    setGraph(updatedGraph);
    debouncedSave(updatedGraph);
  }, [debouncedSave]);

  return (
    <div className="w-screen h-screen fixed top-0 left-0 p-2">
      {isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">{error}</div>
        </div>
      )}
      {!isLoading && !error && (
        <>
          <div className="absolute top-4 right-4 z-50">
            {isSaving && (
              <div className="text-sm text-gray-500">
                Saving...
              </div>
            )}
          </div>
          <WorkflowEditor 
            initialWorkflowGraph={graph} 
            onWorkflowChange={handleGraphChange}
          />
        </>
      )}
    </div>
  );
} 