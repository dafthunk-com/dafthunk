import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { StringParameter, NumberParameter } from "../types";
/**
 * Simplified LLM node implementation with essential parameters
 */
export class Llama318BInstructFastNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "llama-3.1-8b-instruct-fast",
    name: "llama-3.1-8b-instruct-fast",
    type: "llm",
    description: "Generates text",
    category: "Text",
    icon: "ai",
    inputs: [
      {
        name: "prompt",
        type: StringParameter,
        description: "The input text prompt for the LLM",
        required: true,
      },
      {
        name: "temperature",
        type: NumberParameter,
        description: "Controls randomness in the output (0.0 to 1.0)",
        hidden: true,
        value: new NumberParameter(0.7), // Default temperature
      },
      {
        name: "seed",
        type: NumberParameter,
        description: "Random seed for deterministic generation",
        hidden: true,
        value: undefined, // Optional
      },
    ],
    outputs: [
      {
        name: "response",
        type: StringParameter,
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
        response: new StringParameter(result.response),
      });
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
