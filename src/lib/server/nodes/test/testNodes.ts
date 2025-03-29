import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { StringNodeParameter } from "../types";

/**
 * Start node implementation for testing
 */
export class StartNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "start",
    name: "Start",
    type: "start",
    description: "A start node for testing",
    category: "Test",
    icon: "play",
    inputs: [],
    outputs: [{ name: "output", type: StringNodeParameter }],
  };

  async execute(_context: NodeContext): Promise<ExecutionResult> {
    return this.createSuccessResult({
      output: new StringNodeParameter("Hello from start node"),
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
    type: "process",
    description: "A process node for testing",
    category: "Test",
    icon: "cog",
    inputs: [{ name: "input", type: StringNodeParameter }],
    outputs: [{ name: "output", type: StringNodeParameter }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    return this.createSuccessResult({
      output: new StringNodeParameter(`Processed: ${context.inputs.input}`),
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
    type: "error",
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
    type: "long-running",
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
