import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';
import { graphs } from './store';

// Mock crypto.randomUUID
const mockUUID = '123e4567-e89b-12d3-a456-426614174000' as const;
global.crypto.randomUUID = jest.fn(() => mockUUID as `${string}-${string}-${string}-${string}-${string}`);

describe('Graphs API', () => {
  beforeEach(() => {
    // Clear the graphs array before each test
    graphs.length = 0;
  });

  describe('GET /api/graphs', () => {
    it('should return an empty list when no graphs exist', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toEqual({ graphs: [] });
    });

    it('should return a list of existing graphs', async () => {
      // Add a test graph
      graphs.push({
        id: '1',
        name: 'Test Graph',
        nodes: [],
        connections: [],
        createdAt: '2024-02-10T10:00:00Z',
        updatedAt: '2024-02-10T10:00:00Z',
      });

      const response = await GET();
      const data = await response.json();

      expect(data.graphs).toHaveLength(1);
      expect(data.graphs[0]).toEqual({
        id: '1',
        name: 'Test Graph',
        createdAt: '2024-02-10T10:00:00Z',
        updatedAt: '2024-02-10T10:00:00Z',
      });
    });
  });

  describe('POST /api/graphs', () => {
    it('should create a new graph', async () => {
      const graphData = {
        name: 'New Graph',
        nodes: [
          {
            id: 'node1',
            name: 'Text Processor',
            type: 'text-processor',
            inputs: [{ name: 'text', type: 'string' }],
            outputs: [{ name: 'processedText', type: 'string' }],
            position: { x: 100, y: 100 },
          },
        ],
        connections: [],
      };

      const request = new NextRequest('http://localhost/api/graphs', {
        method: 'POST',
        body: JSON.stringify(graphData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        id: expect.any(String),
        name: 'New Graph',
        nodes: graphData.nodes,
        connections: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify the graph was added to storage
      expect(graphs).toHaveLength(1);
      expect(graphs[0]).toEqual(data);
    });
  });
}); 