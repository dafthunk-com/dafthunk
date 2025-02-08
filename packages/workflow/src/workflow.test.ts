import { detectCycles, validateTypeCompatibility, validateWorkflow } from './validation';
import { Graph } from './types';

describe('Workflow Validation', () => {
  describe('detectCycles', () => {
    test('returns null when no cycle exists', () => {
      const graph: Graph = {
        nodes: [
          { id: '1', name: 'Node 1', type: 'Input', inputs: [], outputs: [{ name: 'out', type: 'number' }] },
          { id: '2', name: 'Node 2', type: 'Processor', inputs: [{ name: 'in', type: 'number' }], outputs: [] }
        ],
        connections: [
          { source: '1', target: '2', sourceOutput: 'out', targetInput: 'in' }
        ]
      };
      expect(detectCycles(graph)).toBeNull();
    });

    test('detects a cycle in the graph', () => {
      const graph: Graph = {
        nodes: [
          { id: 'A', name: 'A', type: 'Input', inputs: [{ name: 'in', type: 'number' }], outputs: [{ name: 'out', type: 'number' }] },
          { id: 'B', name: 'B', type: 'Processor', inputs: [{ name: 'in', type: 'number' }], outputs: [{ name: 'out', type: 'number' }] }
        ],
        connections: [
          { source: 'A', target: 'B', sourceOutput: 'out', targetInput: 'in' },
          { source: 'B', target: 'A', sourceOutput: 'out', targetInput: 'in' }
        ]
      };
      const result = detectCycles(graph);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('CYCLE_DETECTED');
    });
  });

  describe('validateTypeCompatibility', () => {
    test('returns null for matching types', () => {
      const graph: Graph = {
        nodes: [
          { id: '1', name: 'Node 1', type: 'Input', inputs: [], outputs: [{ name: 'out', type: 'number' }] },
          { id: '2', name: 'Node 2', type: 'Processor', inputs: [{ name: 'in', type: 'number' }], outputs: [] }
        ],
        connections: [
          { source: '1', target: '2', sourceOutput: 'out', targetInput: 'in' }
        ]
      };
      expect(validateTypeCompatibility(graph)).toBeNull();
    });

    test('returns TYPE_MISMATCH error for incompatible types', () => {
      const graph: Graph = {
        nodes: [
          { id: '1', name: 'Node 1', type: 'Input', inputs: [], outputs: [{ name: 'out', type: 'number' }] },
          { id: '2', name: 'Node 2', type: 'Processor', inputs: [{ name: 'in', type: 'string' }], outputs: [] }
        ],
        connections: [
          { source: '1', target: '2', sourceOutput: 'out', targetInput: 'in' }
        ]
      };
      const result = validateTypeCompatibility(graph);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('TYPE_MISMATCH');
    });

    test('returns INVALID_CONNECTION error for missing node', () => {
      const graph: Graph = {
        nodes: [
          { id: '1', name: 'Node 1', type: 'Input', inputs: [], outputs: [{ name: 'out', type: 'number' }] }
        ],
        connections: [
          { source: '1', target: '2', sourceOutput: 'out', targetInput: 'in' }
        ]
      };
      const result = validateTypeCompatibility(graph);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('INVALID_CONNECTION');
    });

    test('returns INVALID_CONNECTION error for missing parameter', () => {
      const graph: Graph = {
        nodes: [
          { id: '1', name: 'Node 1', type: 'Input', inputs: [], outputs: [{ name: 'out', type: 'number' }] },
          { id: '2', name: 'Node 2', type: 'Processor', inputs: [{ name: 'in', type: 'number' }], outputs: [] }
        ],
        connections: [
          { source: '1', target: '2', sourceOutput: 'nonExistent', targetInput: 'in' }
        ]
      };
      const result = validateTypeCompatibility(graph);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('INVALID_CONNECTION');
    });
  });

  describe('validateWorkflow', () => {
    test('returns an empty array when there are no errors', () => {
      const graph: Graph = {
        nodes: [
          { id: '1', name: 'Node 1', type: 'Input', inputs: [], outputs: [{ name: 'out', type: 'number' }] },
          { id: '2', name: 'Node 2', type: 'Processor', inputs: [{ name: 'in', type: 'number' }], outputs: [] }
        ],
        connections: [
          { source: '1', target: '2', sourceOutput: 'out', targetInput: 'in' }
        ]
      };
      const errors = validateWorkflow(graph);
      expect(errors).toHaveLength(0);
    });

    test('returns DUPLICATE_CONNECTION error when duplicate connections exist', () => {
      const graph: Graph = {
        nodes: [
          { id: '1', name: 'Node 1', type: 'Input', inputs: [], outputs: [{ name: 'out', type: 'number' }] },
          { id: '2', name: 'Node 2', type: 'Processor', inputs: [{ name: 'in', type: 'number' }], outputs: [] }
        ],
        connections: [
          { source: '1', target: '2', sourceOutput: 'out', targetInput: 'in' },
          { source: '1', target: '2', sourceOutput: 'out', targetInput: 'in' }
        ]
      };
      const errors = validateWorkflow(graph);
      const duplicateError = errors.find(error => error.type === 'DUPLICATE_CONNECTION');
      expect(duplicateError).toBeDefined();
    });
  });
}); 