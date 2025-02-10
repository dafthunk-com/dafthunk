import { Graph } from '@repo/workflow';

// In-memory storage for demonstration
// In a real app, this would be replaced with a database
export const graphs: Graph[] = [
  {
    id: "1",
    name: "Simple Approval Flow",
    nodes: [
      {
        id: "1",
        type: "start",
        position: { x: 100, y: 100 },
        data: { label: "Start" }
      },
      {
        id: "2",
        type: "task",
        position: { x: 300, y: 100 },
        data: { label: "Review Document" }
      },
      {
        id: "3",
        type: "end",
        position: { x: 500, y: 100 },
        data: { label: "End" }
      }
    ],
    edges: [
      {
        id: "e1-2",
        source: "1",
        target: "2"
      },
      {
        id: "e2-3",
        source: "2",
        target: "3"
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
        type: "start",
        position: { x: 100, y: 100 },
        data: { label: "Start" }
      },
      {
        id: "2",
        type: "task",
        position: { x: 300, y: 100 },
        data: { label: "Upload Document" }
      },
      {
        id: "3",
        type: "task",
        position: { x: 500, y: 100 },
        data: { label: "Process Document" }
      },
      {
        id: "4",
        type: "end",
        position: { x: 700, y: 100 },
        data: { label: "End" }
      }
    ],
    edges: [
      {
        id: "e1-2",
        source: "1",
        target: "2"
      },
      {
        id: "e2-3",
        source: "2",
        target: "3"
      },
      {
        id: "e3-4",
        source: "3",
        target: "4"
      }
    ],
    createdAt: "2024-03-19T15:30:00Z",
    updatedAt: "2024-03-20T09:15:00Z"
  }
]; 