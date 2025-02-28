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
 * Addition node implementation
 */
export class AdditionNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult('Both inputs must be numbers');
      }

      return this.createSuccessResult({
        result: a + b
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Subtraction node implementation
 */
export class SubtractionNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult('Both inputs must be numbers');
      }

      return this.createSuccessResult({
        result: a - b
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Multiplication node implementation
 */
export class MultiplicationNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult('Both inputs must be numbers');
      }

      return this.createSuccessResult({
        result: a * b
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Division node implementation
 */
export class DivisionNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult('Both inputs must be numbers');
      }

      if (b === 0) {
        return this.createErrorResult('Division by zero is not allowed');
      }

      return this.createSuccessResult({
        result: a / b
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Register the mathematical operation nodes
 */
export function registerBaseNodes(): void {
  const registry = NodeRegistry.getInstance();
  
  registry.registerImplementation({
    type: 'addition',
    createExecutableNode: (node: Node) => new AdditionNode(node)
  });
  
  registry.registerImplementation({
    type: 'subtraction',
    createExecutableNode: (node: Node) => new SubtractionNode(node)
  });
  
  registry.registerImplementation({
    type: 'multiplication',
    createExecutableNode: (node: Node) => new MultiplicationNode(node)
  });
  
  registry.registerImplementation({
    type: 'division',
    createExecutableNode: (node: Node) => new DivisionNode(node)
  });
} 