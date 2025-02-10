'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Graph, Node, Edge } from '@repo/workflow';
import { WorkflowEditor } from './workflow-editor';

// Default empty graph structure
const emptyGraph: Graph = {
  nodes: [],
  edges: [],
};

// Validate node structure
const isValidNode = (node: any): node is Node => {
  return (
    typeof node === 'object' &&
    typeof node.id === 'string' &&
    typeof node.name === 'string' &&
    typeof node.type === 'string' &&
    Array.isArray(node.inputs) &&
    Array.isArray(node.outputs) &&
    typeof node.position === 'object' &&
    typeof node.position.x === 'number' &&
    typeof node.position.y === 'number'
  );
};

// Validate edge structure
const isValidEdge = (edge: any): edge is Edge => {
  return (
    typeof edge === 'object' &&
    typeof edge.source === 'string' &&
    typeof edge.target === 'string' &&
    typeof edge.sourceOutput === 'string' &&
    typeof edge.targetInput === 'string'
  );
};

export default function FlowPage() {
  const { id } = useParams();
  const [graph, setGraph] = useState<Graph>(emptyGraph);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const response = await fetch(`/api/graphs/${id}`);
        if (!response.ok) {
          throw new Error('Failed to load graph');
        }
        const data = await response.json();
        
        // Validate and filter nodes and connections
        const validNodes = Array.isArray(data.nodes) 
          ? data.nodes.filter(isValidNode)
          : [];
        
        const validConnections = Array.isArray(data.connections)
          ? data.connections.filter(isValidEdge)
          : [];

        setGraph({
          nodes: validNodes,
          edges: validConnections,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setGraph(emptyGraph);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGraph();
  }, [id]);

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
      {!isLoading && <WorkflowEditor initialWorkflowGraph={graph} />}
    </div>
  );
} 