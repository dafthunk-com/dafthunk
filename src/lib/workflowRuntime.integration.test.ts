import { describe, it, expect, beforeAll } from 'vitest';
import { WorkflowRuntime } from './workflowRuntime';
import { 
  Workflow, 
  WorkflowExecutionOptions
} from './workflowTypes';
import { registerBaseNodes } from './nodes/baseNodes';

// Ensure base nodes are registered
beforeAll(() => {
  registerBaseNodes();
});

describe('WorkflowRuntime Integration Tests', () => {
  it('should execute a simple workflow with start and end nodes', async () => {
    // Create a simple workflow with start and end nodes
    const workflow: Workflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      nodes: [
        {
          id: 'start-node',
          name: 'Start',
          type: 'start',
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [
            { name: 'message', type: 'string', value: 'Hello, World!' }
          ]
        },
        {
          id: 'end-node',
          name: 'End',
          type: 'end',
          position: { x: 300, y: 100 },
          inputs: [
            { name: 'result', type: 'string' }
          ],
          outputs: []
        }
      ],
      edges: [
        {
          source: 'start-node',
          target: 'end-node',
          sourceOutput: 'message',
          targetInput: 'result'
        }
      ]
    };

    // Create execution options with tracking
    const executedNodes: string[] = [];
    const nodeOutputs: Record<string, any> = {};
    
    const options: WorkflowExecutionOptions = {
      onNodeStart: (_nodeId) => {
        // Track node execution start
      },
      onNodeComplete: (nodeId, outputs) => {
        executedNodes.push(nodeId);
        nodeOutputs[nodeId] = outputs;
      },
      onNodeError: (_nodeId, _error) => {
        // Track node errors
      },
      onExecutionComplete: () => {
        // Track execution completion
      }
    };

    // Execute the workflow
    const runtime = new WorkflowRuntime(workflow, options);
    await runtime.execute();

    // Verify execution
    expect(executedNodes).toHaveLength(2);
    expect(executedNodes).toContain('start-node');
    expect(executedNodes).toContain('end-node');
    
    // Verify data passing
    expect(nodeOutputs['start-node']).toHaveProperty('message', 'Hello, World!');
    expect(nodeOutputs['end-node']).toHaveProperty('result', 'Hello, World!');
  });

  it('should execute a workflow with conditional logic', async () => {
    // Create a workflow with a conditional node
    const workflow: Workflow = {
      id: 'conditional-workflow',
      name: 'Conditional Workflow',
      nodes: [
        {
          id: 'start-node',
          name: 'Start',
          type: 'start',
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [
            { name: 'value', type: 'number', value: 42 }
          ]
        },
        {
          id: 'conditional-node',
          name: 'Conditional',
          type: 'conditional',
          position: { x: 300, y: 100 },
          inputs: [
            { name: 'condition', type: 'boolean', value: true },
            { name: 'value', type: 'number' }
          ],
          outputs: [
            { name: 'result', type: 'boolean' },
            { name: 'value', type: 'number' }
          ]
        },
        {
          id: 'end-node',
          name: 'End',
          type: 'end',
          position: { x: 500, y: 100 },
          inputs: [
            { name: 'result', type: 'boolean' },
            { name: 'value', type: 'number' }
          ],
          outputs: []
        }
      ],
      edges: [
        {
          source: 'start-node',
          target: 'conditional-node',
          sourceOutput: 'value',
          targetInput: 'value'
        },
        {
          source: 'conditional-node',
          target: 'end-node',
          sourceOutput: 'result',
          targetInput: 'result'
        },
        {
          source: 'conditional-node',
          target: 'end-node',
          sourceOutput: 'value',
          targetInput: 'value'
        }
      ]
    };

    // Create execution options with tracking
    const executedNodes: string[] = [];
    const nodeOutputs: Record<string, any> = {};
    
    const options: WorkflowExecutionOptions = {
      onNodeComplete: (nodeId, outputs) => {
        executedNodes.push(nodeId);
        nodeOutputs[nodeId] = outputs;
      }
    };

    // Execute the workflow
    const runtime = new WorkflowRuntime(workflow, options);
    await runtime.execute();

    // Verify execution
    expect(executedNodes).toHaveLength(3);
    expect(executedNodes[0]).toBe('start-node');
    expect(executedNodes[1]).toBe('conditional-node');
    expect(executedNodes[2]).toBe('end-node');
    
    // Verify data passing
    expect(nodeOutputs['start-node']).toHaveProperty('value', 42);
    expect(nodeOutputs['conditional-node']).toHaveProperty('result', true);
    expect(nodeOutputs['conditional-node']).toHaveProperty('value', 42);
    expect(nodeOutputs['end-node']).toHaveProperty('result', true);
    expect(nodeOutputs['end-node']).toHaveProperty('value', 42);
  });

  it('should execute a workflow with an HTTP request node', async () => {
    // Create a workflow with an HTTP request node
    const workflow: Workflow = {
      id: 'http-workflow',
      name: 'HTTP Workflow',
      nodes: [
        {
          id: 'start-node',
          name: 'Start',
          type: 'start',
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [
            { name: 'url', type: 'string', value: 'https://api.example.com' }
          ]
        },
        {
          id: 'http-node',
          name: 'HTTP Request',
          type: 'http-request',
          position: { x: 300, y: 100 },
          inputs: [
            { name: 'url', type: 'string' },
            { name: 'method', type: 'string', value: 'GET' }
          ],
          outputs: [
            { name: 'status', type: 'number' },
            { name: 'body', type: 'object' },
            { name: 'headers', type: 'object' }
          ]
        },
        {
          id: 'end-node',
          name: 'End',
          type: 'end',
          position: { x: 500, y: 100 },
          inputs: [
            { name: 'status', type: 'number' },
            { name: 'body', type: 'object' }
          ],
          outputs: []
        }
      ],
      edges: [
        {
          source: 'start-node',
          target: 'http-node',
          sourceOutput: 'url',
          targetInput: 'url'
        },
        {
          source: 'http-node',
          target: 'end-node',
          sourceOutput: 'status',
          targetInput: 'status'
        },
        {
          source: 'http-node',
          target: 'end-node',
          sourceOutput: 'body',
          targetInput: 'body'
        }
      ]
    };

    // Create execution options with tracking
    const executedNodes: string[] = [];
    const nodeOutputs: Record<string, any> = {};
    
    const options: WorkflowExecutionOptions = {
      onNodeComplete: (nodeId, outputs) => {
        executedNodes.push(nodeId);
        nodeOutputs[nodeId] = outputs;
      }
    };

    // Execute the workflow
    const runtime = new WorkflowRuntime(workflow, options);
    await runtime.execute();

    // Verify execution
    expect(executedNodes).toHaveLength(3);
    expect(executedNodes[0]).toBe('start-node');
    expect(executedNodes[1]).toBe('http-node');
    expect(executedNodes[2]).toBe('end-node');
    
    // Verify data passing
    expect(nodeOutputs['start-node']).toHaveProperty('url', 'https://api.example.com');
    expect(nodeOutputs['http-node']).toHaveProperty('status', 200);
    expect(nodeOutputs['http-node'].body).toHaveProperty('message');
    expect(nodeOutputs['end-node']).toHaveProperty('status', 200);
    expect(nodeOutputs['end-node'].body).toHaveProperty('message');
  });

  it('should handle a complex workflow with multiple paths', async () => {
    // Create a more complex workflow with multiple paths
    const workflow: Workflow = {
      id: 'complex-workflow',
      name: 'Complex Workflow',
      nodes: [
        {
          id: 'start-node',
          name: 'Start',
          type: 'start',
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [
            { name: 'value', type: 'number', value: 42 }
          ]
        },
        {
          id: 'function-node',
          name: 'Function',
          type: 'function',
          position: { x: 300, y: 100 },
          inputs: [
            { name: 'input', type: 'number' }
          ],
          outputs: [
            { name: 'output', type: 'number' }
          ]
        },
        {
          id: 'conditional-node',
          name: 'Conditional',
          type: 'conditional',
          position: { x: 500, y: 100 },
          inputs: [
            { name: 'condition', type: 'boolean', value: true },
            { name: 'value', type: 'number' }
          ],
          outputs: [
            { name: 'result', type: 'boolean' },
            { name: 'value', type: 'number' }
          ]
        },
        {
          id: 'end-node-1',
          name: 'End 1',
          type: 'end',
          position: { x: 700, y: 50 },
          inputs: [
            { name: 'result', type: 'boolean' }
          ],
          outputs: []
        },
        {
          id: 'end-node-2',
          name: 'End 2',
          type: 'end',
          position: { x: 700, y: 150 },
          inputs: [
            { name: 'value', type: 'number' }
          ],
          outputs: []
        }
      ],
      edges: [
        {
          source: 'start-node',
          target: 'function-node',
          sourceOutput: 'value',
          targetInput: 'input'
        },
        {
          source: 'function-node',
          target: 'conditional-node',
          sourceOutput: 'output',
          targetInput: 'value'
        },
        {
          source: 'conditional-node',
          target: 'end-node-1',
          sourceOutput: 'result',
          targetInput: 'result'
        },
        {
          source: 'conditional-node',
          target: 'end-node-2',
          sourceOutput: 'value',
          targetInput: 'value'
        }
      ]
    };

    // Create execution options with tracking
    const executedNodes: string[] = [];
    const nodeOutputs: Record<string, any> = {};
    
    const options: WorkflowExecutionOptions = {
      onNodeComplete: (nodeId, outputs) => {
        executedNodes.push(nodeId);
        nodeOutputs[nodeId] = outputs;
      }
    };

    // Execute the workflow
    const runtime = new WorkflowRuntime(workflow, options);
    await runtime.execute();

    // Verify execution
    expect(executedNodes).toHaveLength(5);
    expect(executedNodes[0]).toBe('start-node');
    expect(executedNodes[1]).toBe('function-node');
    expect(executedNodes[2]).toBe('conditional-node');
    // End nodes can be executed in any order
    expect(executedNodes.slice(3)).toContain('end-node-1');
    expect(executedNodes.slice(3)).toContain('end-node-2');
    
    // Verify data passing
    expect(nodeOutputs['start-node']).toHaveProperty('value', 42);
    expect(nodeOutputs['function-node']).toBeDefined();
    expect(nodeOutputs['conditional-node']).toHaveProperty('result', true);
    expect(nodeOutputs['end-node-1']).toHaveProperty('result', true);
    expect(nodeOutputs['end-node-2']).toBeDefined();
  });
}); 