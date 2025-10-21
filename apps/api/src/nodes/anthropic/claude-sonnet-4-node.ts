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
    tags: ["AI", "Chat", "Anthropic", "Claude", "Sonnet"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude Sonnet 4 model to generate text responses based on input prompts.",
    computeCost: 30,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Anthropic integration to use",
        hidden: true,
        required: false,
      },
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
        name: "text",
        type: "string",
        description: "Generated text response from Claude Sonnet 4",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, instructions, input } = context.inputs;

      // Get API key from integration
      let anthropicApiKey: string | undefined;

      if (integrationId && typeof integrationId === "string") {
        const integration = context.integrations?.[integrationId];
        if (integration?.provider === "anthropic") {
          anthropicApiKey = integration.token;
        }
      }

      if (!anthropicApiKey) {
        return this.createErrorResult(
          "Anthropic integration is required. Please connect an Anthropic integration."
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
        text: responseText,
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
