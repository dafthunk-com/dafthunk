import { Graph } from '../src/lib/types';

// In a real application, this would be replaced with a proper database
export const graphs: Graph[] = [
  {
    id: "1",
    name: "Simple Approval Flow",
    nodes: [
      {
        id: "1",
        name: "Start",
        type: "start",
        position: { x: 100, y: 100 },
        inputs: [],
        outputs: [
          { name: "output", type: "trigger" }
        ]
      },
      {
        id: "2",
        name: "Review Document",
        type: "task",
        position: { x: 450, y: 100 },
        inputs: [
          { name: "input", type: "trigger" }
        ],
        outputs: [
          { name: "approved", type: "trigger" },
          { name: "rejected", type: "trigger" }
        ]
      },
      {
        id: "3",
        name: "End",
        type: "end",
        position: { x: 800, y: 100 },
        inputs: [
          { name: "input", type: "trigger" }
        ],
        outputs: []
      }
    ],
    edges: [
      {
        source: "1",
        target: "2",
        sourceOutput: "output",
        targetInput: "input"
      },
      {
        source: "2",
        target: "3",
        sourceOutput: "approved",
        targetInput: "input"
      }
    ],
    createdAt: "2024-03-20T10:00:00Z",
    updatedAt: "2024-03-20T10:00:00Z"
  },
  {
    id: "2",
    name: "Document Processing",
    nodes: [
      {
        id: "1",
        name: "Start",
        type: "start",
        position: { x: 100, y: 100 },
        inputs: [],
        outputs: [
          { name: "output", type: "trigger" }
        ]
      },
      {
        id: "2",
        name: "Upload Document",
        type: "task",
        position: { x: 450, y: 100 },
        inputs: [
          { name: "input", type: "trigger" }
        ],
        outputs: [
          { name: "success", type: "trigger" }
        ]
      },
      {
        id: "3",
        name: "Process Document",
        type: "task",
        position: { x: 800, y: 100 },
        inputs: [
          { name: "input", type: "trigger" }
        ],
        outputs: [
          { name: "success", type: "trigger" }
        ]
      },
      {
        id: "4",
        name: "End",
        type: "end",
        position: { x: 1150, y: 100 },
        inputs: [
          { name: "input", type: "trigger" }
        ],
        outputs: []
      }
    ],
    edges: [
      {
        source: "1",
        target: "2",
        sourceOutput: "output",
        targetInput: "input"
      },
      {
        source: "2",
        target: "3",
        sourceOutput: "success",
        targetInput: "input"
      },
      {
        source: "3",
        target: "4",
        sourceOutput: "success",
        targetInput: "input"
      }
    ],
    createdAt: "2024-03-19T15:30:00Z",
    updatedAt: "2024-03-20T09:15:00Z"
  }
];

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