import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
/**
 * Simplified LLM node implementation with essential parameters
 */
export class Llama318BInstructFastNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "llama-3-1-8b-instruct-fast",
    name: "Llama 3.1 8B Instruct Fast",
    type: "llama-3-1-8b-instruct-fast",
    description: "Generates text using Llama 3.1 8B Instruct Fast model",
    tags: ["AI", "Chat", "Cloudflare", "Llama"],
    icon: "sparkles",
    documentation:
      "This node generates text using Meta's Llama 3.1 8B Instruct Fast model.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fast/",
    computeCost: 10,
    asTool: true,
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

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { prompt, seed, temperature } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const result = (await context.env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast" as keyof AiModels,
        {
          prompt,
          seed,
          temperature,
        },
        context.env.AI_OPTIONS
      )) as AiTextGenerationOutput;

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
