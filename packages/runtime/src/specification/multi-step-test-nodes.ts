import type { NodeExecution, NodeType } from "@dafthunk/types";

import type { MultiStepNodeContext } from "../node-types";
import { MultiStepNode } from "../node-types";

/**
 * Test multi-step node that adds two numbers using doStep.
 *
 * Execution steps:
 *   1. doStep: compute a + b
 *   2. doStep: double the sum
 *
 * Output: result = (a + b) * 2
 *
 * Note: sleep is not exercised here because setTimeout breaks
 * AsyncLocalStorage in the Cloudflare Workers test pool.
 * The type system guarantees sleep is present on MultiStepNodeContext.
 */
export class MultiStepAdditionNode extends MultiStepNode {
  public static readonly nodeType: NodeType = {
    id: "multi-step-addition",
    name: "Multi-Step Addition",
    type: "multi-step-addition",
    description: "Adds two numbers using multiple durable steps (test node)",
    tags: ["Math", "Test"],
    icon: "plus",
    inputs: [
      { name: "a", type: "number", required: true },
      { name: "b", type: "number", required: true },
    ],
    outputs: [{ name: "result", type: "number" }],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { doStep } = context;

    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (Number.isNaN(a) || Number.isNaN(b)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      // Step 1: compute sum
      const sum = await doStep(async () => a + b);

      // Step 2: double the result
      const result = await doStep(async () => sum * 2);

      return this.createSuccessResult({ result });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}

/**
 * Test multi-step node that always fails inside a doStep call.
 * Used to verify error propagation from multi-step nodes.
 */
export class FailingMultiStepNode extends MultiStepNode {
  public static readonly nodeType: NodeType = {
    id: "failing-multi-step",
    name: "Failing Multi-Step",
    type: "failing-multi-step",
    description: "Always fails inside doStep (test node)",
    tags: ["Test"],
    icon: "x",
    inputs: [{ name: "value", type: "number" }],
    outputs: [{ name: "result", type: "number" }],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { doStep } = context;

    try {
      await doStep(async () => {
        throw new Error("Intentional failure in doStep");
      });
      return this.createSuccessResult({ result: 0 });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
