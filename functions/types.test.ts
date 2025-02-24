import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequest } from './types';
import { drizzle } from 'drizzle-orm/d1';
import { nodeTypes } from '../db/schema';

// Define the type for our node type responses
interface NodeType {
  id: string;
  name: string;
  description: string;
  inputs: unknown;
  outputs: unknown;
}

// Mock drizzle
vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(),
}));

describe('types function', () => {
  let mockDb: any;
  let mockContext: {
    env: {
      DB: D1Database;
    };
  };
  let consoleErrorSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods to suppress output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Setup mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockResolvedValue([
        {
          id: '1',
          name: 'Start',
          description: 'Start node',
          inputs: JSON.stringify([]),
          outputs: JSON.stringify(['output1']),
        },
      ]),
    };

    (drizzle as any).mockReturnValue(mockDb);

    // Setup mock D1 database
    const mockD1Db = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [
            {
              id: '1',
              name: 'Start',
              description: 'Start node',
              inputs: '[]',
              outputs: '["output1"]',
            },
          ],
        }),
      }),
    };

    // Setup mock context
    mockContext = {
      env: {
        DB: mockD1Db as unknown as D1Database,
      },
    };
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('successful responses', () => {
    it('should return node types using drizzle', async () => {
      const response = await onRequest(mockContext as any);
      const data = await response.json() as NodeType[];

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(data).toHaveLength(1);
      expect(data[0]).toHaveProperty('id', '1');
      expect(data[0]).toHaveProperty('name', 'Start');
    });

    it('should fallback to raw D1 query when drizzle fails', async () => {
      // Make drizzle fail
      mockDb.from.mockRejectedValueOnce(new Error('Drizzle error'));

      const response = await onRequest(mockContext as any);
      const data = await response.json() as NodeType[];

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0]).toHaveProperty('id', '1');
      expect(data[0]).toHaveProperty('name', 'Start');
      // Verify JSON fields are parsed
      expect(Array.isArray(data[0].inputs)).toBe(true);
      expect(Array.isArray(data[0].outputs)).toBe(true);

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Drizzle query failed:', expect.any(Error));
      expect(consoleLogSpy).toHaveBeenCalledWith('Raw D1 query successful:', expect.any(Array));
    });
  });

  describe('error handling', () => {
    it('should handle missing DB binding', async () => {
      const contextWithoutDb = {
        env: {},
      };

      const response = await onRequest(contextWithoutDb as any);
      const data = await response.json() as { error: string; stack?: string };

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error', 'Database binding not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in types function:', expect.any(Error));
    });

    it('should handle JSON parsing errors in raw query results', async () => {
      // Setup invalid JSON in the mock D1 response
      mockContext.env.DB.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [
            {
              id: '1',
              name: 'Start',
              description: 'Start node',
              inputs: 'invalid json',
              outputs: 'invalid json',
            },
          ],
        }),
      });

      // Make drizzle fail to force raw query path
      mockDb.from.mockRejectedValueOnce(new Error('Drizzle error'));

      const response = await onRequest(mockContext as any);
      const data = await response.json() as NodeType[];

      expect(response.status).toBe(200);
      expect(data[0]).toHaveProperty('inputs', 'invalid json');
      expect(data[0]).toHaveProperty('outputs', 'invalid json');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing JSON fields:', expect.any(Error));
    });
  });
}); 