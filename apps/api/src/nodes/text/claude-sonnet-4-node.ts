import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Claude Sonnet 4 node implementation using the Anthropic SDK
 * Latest generation Sonnet model with advanced capabilities
 */
export class ClaudeSonnet4Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    type: "claude-sonnet-4",
    description: "Latest Claude Sonnet model with advanced capabilities",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation: "*Missing detailed documentation*",
    computeCost: 30,
    asTool: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for Claude's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for Claude",
        required: true,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response from Claude Sonnet 4",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { instructions, input } = context.inputs;

      if (!context.env.ANTHROPIC_API_KEY) {
        return this.createErrorResult("ANTHROPIC_API_KEY is not configured");
      }

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      const client = new Anthropic({
        apiKey: context.env.ANTHROPIC_API_KEY,
        timeout: 60000,
      });

      const response = await client.messages.create({
        model: "claude-sonnet-4-0",
        max_tokens: 1024,
        messages: [{ role: "user", content: input }],
        ...(instructions && { system: instructions }),
      });

      const responseText = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      return this.createSuccessResult({
        response: responseText,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof APIError) {
        return this.createErrorResult(`Claude API error: ${error.message}`);
      }
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
