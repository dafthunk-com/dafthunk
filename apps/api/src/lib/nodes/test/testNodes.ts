import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../types";
import { NodeType } from "../../api/types";
import { StringValue } from "../types";

/**
 * Start node implementation for testing
 */
export class StartNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "start",
    name: "Start",
    description: "A start node for testing",
    category: "Test",
    icon: "play",
    inputs: [],
    outputs: [{ name: "output", type: StringValue }],
  };

  async execute(_context: NodeContext): Promise<ExecutionResult> {
    return this.createSuccessResult({
      output: new StringValue("Hello from start node"),
    });
  }
}

/**
 * Process node implementation for testing
 */
export class ProcessNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "process",
    name: "Process",
    description: "A process node for testing",
    category: "Test",
    icon: "cog",
    inputs: [{ name: "input", type: StringValue }],
    outputs: [{ name: "output", type: StringValue }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    return this.createSuccessResult({
      output: new StringValue(`Processed: ${context.inputs.input}`),
    });
  }
}

/**
 * Error node implementation for testing
 */
export class ErrorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "error",
    name: "Error",
    description: "An error node for testing",
    category: "Test",
    icon: "error",
    inputs: [],
    outputs: [],
  };

  async execute(_context: NodeContext): Promise<ExecutionResult> {
    return this.createErrorResult("Test error");
  }
}

/**
 * Long running node implementation for testing
 */
export class LongRunningNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "long-running",
    name: "Long Running",
    description: "A long running node for testing",
    category: "Test",
    icon: "clock",
    inputs: [],
    outputs: [],
  };

  async execute(_context: NodeContext): Promise<ExecutionResult> {
    // Simulate a long running operation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.createSuccessResult({});
  }
}
