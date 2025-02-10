import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET, PUT, DELETE } from './route';
import { NextRequest } from 'next/server';
import { graphs } from '../store';

describe('Graph API', () => {
  const testGraph = {
    id: '1',
    name: 'Test Graph',
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
    edges: [],
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-02-10T10:00:00Z',
  };

  beforeEach(() => {
    // Reset graphs array before each test
    graphs.length = 0;
    graphs.push(testGraph);
  });

  describe('GET /api/graphs/:id', () => {
    it('should return a specific graph', async () => {
      const response = await GET(
        new NextRequest('http://localhost/api/graphs/1'),
        { params: { id: '1' } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(testGraph);
    });

    it('should return 404 for non-existent graph', async () => {
      const response = await GET(
        new NextRequest('http://localhost/api/graphs/999'),
        { params: { id: '999' } }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Graph not found' });
    });
  });

  describe('PUT /api/graphs/:id', () => {
    it('should update an existing graph', async () => {
      const updateData = {
        name: 'Updated Graph',
        nodes: [
          {
            id: 'node2',
            name: 'LLM Model',
            type: 'llm-model',
            inputs: [{ name: 'prompt', type: 'string' }],
            outputs: [{ name: 'response', type: 'string' }],
            position: { x: 200, y: 200 },
          },
        ],
      };

      const response = await PUT(
        new NextRequest('http://localhost/api/graphs/1', {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }),
        { params: { id: '1' } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        ...testGraph,
        ...updateData,
        id: '1',
        updatedAt: expect.any(String),
      });
    });

    it('should return 404 for updating non-existent graph', async () => {
      const response = await PUT(
        new NextRequest('http://localhost/api/graphs/999', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Graph' }),
        }),
        { params: { id: '999' } }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Graph not found' });
    });
  });

  describe('DELETE /api/graphs/:id', () => {
    it('should delete an existing graph', async () => {
      const response = await DELETE(
        new NextRequest('http://localhost/api/graphs/1'),
        { params: { id: '1' } }
      );

      expect(response.status).toBe(204);
      expect(graphs).toHaveLength(0);
    });

    it('should return 404 for deleting non-existent graph', async () => {
      const response = await DELETE(
        new NextRequest('http://localhost/api/graphs/999'),
        { params: { id: '999' } }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Graph not found' });
    });
  });
}); 