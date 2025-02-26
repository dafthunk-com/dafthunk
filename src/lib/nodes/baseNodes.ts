import { 
  Node, 
  ExecutableNode, 
  NodeContext, 
  ExecutionResult, 
  NodeRegistry
} from '../workflowTypes';

/**
 * Base class for all executable nodes
 */
export abstract class BaseExecutableNode implements ExecutableNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  position: { x: number; y: number };
  inputs: { name: string; type: string; description?: string; value?: any }[];
  outputs: { name: string; type: string; description?: string; value?: any }[];
  error?: string;

  constructor(node: Node) {
    this.id = node.id;
    this.name = node.name;
    this.type = node.type;
    this.description = node.description;
    this.position = node.position;
    this.inputs = node.inputs;
    this.outputs = node.outputs;
    this.error = node.error;
  }

  abstract execute(context: NodeContext): Promise<ExecutionResult>;

  protected createSuccessResult(outputs: Record<string, any>): ExecutionResult {
    return {
      nodeId: this.id,
      success: true,
      outputs
    };
  }

  protected createErrorResult(error: string): ExecutionResult {
    return {
      nodeId: this.id,
      success: false,
      error
    };
  }
}

/**
 * Start node implementation
 */
export class StartNode extends BaseExecutableNode {
  async execute(_context: NodeContext): Promise<ExecutionResult> {
    try {
      // Start node just passes its input values as outputs
      const outputs: Record<string, any> = {};
      
      for (const output of this.outputs) {
        outputs[output.name] = output.value || null;
      }
      
      return this.createSuccessResult(outputs);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * End node implementation
 */
export class EndNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      // End node just collects inputs
      return this.createSuccessResult(context.inputs);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Function node implementation
 */
export class FunctionNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      // In a real implementation, this would execute a JavaScript function
      // For now, we'll just pass through the inputs
      return this.createSuccessResult(context.inputs);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * HTTP Request node implementation
 */
export class HttpRequestNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const url = context.inputs.url as string;
      // We're not using method yet, but we'll keep it for future implementation
      // const method = context.inputs.method as string || 'GET';
      
      if (!url) {
        return this.createErrorResult('URL is required');
      }
      
      // In a real implementation, this would make an actual HTTP request
      // For now, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return this.createSuccessResult({
        status: 200,
        body: { message: `Simulated response from ${url}` },
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Conditional node implementation
 */
export class ConditionalNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const condition = context.inputs.condition;
      
      // Evaluate the condition
      let result: boolean;
      if (typeof condition === 'boolean') {
        result = condition;
      } else if (typeof condition === 'string') {
        // Try to evaluate the condition as a JavaScript expression
        try {
          // This is just for demonstration - in a real implementation,
          // you would want to use a safer evaluation method
          result = Boolean(eval(condition));
        } catch (e) {
          return this.createErrorResult(`Failed to evaluate condition: ${e}`);
        }
      } else {
        result = Boolean(condition);
      }
      
      return this.createSuccessResult({
        result,
        value: context.inputs.value
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Register the base node implementations
 */
export function registerBaseNodes(): void {
  const registry = NodeRegistry.getInstance();
  
  registry.registerImplementation({
    type: 'start',
    createExecutableNode: (node: Node) => new StartNode(node)
  });
  
  registry.registerImplementation({
    type: 'end',
    createExecutableNode: (node: Node) => new EndNode(node)
  });
  
  registry.registerImplementation({
    type: 'function',
    createExecutableNode: (node: Node) => new FunctionNode(node)
  });
  
  registry.registerImplementation({
    type: 'http-request',
    createExecutableNode: (node: Node) => new HttpRequestNode(node)
  });
  
  registry.registerImplementation({
    type: 'conditional',
    createExecutableNode: (node: Node) => new ConditionalNode(node)
  });
} 