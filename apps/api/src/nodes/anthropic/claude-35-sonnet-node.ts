import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Claude 3.5 Sonnet node implementation using the Anthropic SDK
 * Well-tested model with excellent performance/cost balance
 */
export class Claude35SonnetNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-35-sonnet",
    name: "Claude 3.5 Sonnet",
    type: "claude-35-sonnet",
    description: "Well-tested model with excellent performance/cost balance",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude 3.5 Sonnet model with excellent performance/cost balance.",
    computeCost: 25,
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
      {
        name: "apiKey",
        type: "secret",
        description: "Anthropic API key secret name",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response from Claude 3.5 Sonnet",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { instructions, input, apiKey } = context.inputs;

      // Use provided API key secret or fallback to environment variable
      const anthropicApiKey =
        (apiKey && context.secrets?.[apiKey]) || context.env.ANTHROPIC_API_KEY;

      if (!anthropicApiKey) {
        return this.createErrorResult(
          "Anthropic API key is required. Provide via apiKey input or ANTHROPIC_API_KEY environment variable"
        );
      }

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      const client = new Anthropic({
        apiKey: anthropicApiKey,
        timeout: 60000,
      });

      const response = await client.messages.create({
        model: "claude-3-5-sonnet-latest",
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
