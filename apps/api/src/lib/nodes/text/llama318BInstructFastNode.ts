import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../types";
import { NodeType } from "../../api/types";
/**
 * Simplified LLM node implementation with essential parameters
 */
export class Llama318BInstructFastNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "llama-3.1-8b-instruct-fast",
    name: "llama-3.1-8b-instruct-fast",
    type: "llama-3.1-8b-instruct-fast",
    description: "Generates text",
    category: "Text",
    icon: "ai",
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "The input text prompt for the LLM",
        required: true,
      },
      {
        name: "temperature",
        type: "number",
        description: "Controls randomness in the output (0.0 to 1.0)",
        hidden: true,
        value: 0.7, // Default temperature
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for deterministic generation",
        hidden: true,
        value: undefined, // Optional
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { prompt, seed, temperature } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const result = await context.env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          prompt,
          seed,
          temperature,
        }
      );

      return this.createSuccessResult({
        response: result.response,
      });
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
