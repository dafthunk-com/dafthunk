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
    tags: ["AI", "LLM", "Anthropic", "Claude", "Sonnet"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude 3.5 Sonnet model with excellent performance/cost balance.",
    usage: 25,
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
        name: "response",
        type: "string",
        description: "Generated text response from Claude 3.5 Sonnet",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, instructions, input } = context.inputs;

      // Get API key from integration
      let anthropicApiKey: string | undefined;

      if (integrationId && typeof integrationId === "string") {
        try {
          const integration = await context.getIntegration(integrationId);
          if (integration.provider === "anthropic") {
            anthropicApiKey = integration.token;
          }
        } catch {
          // Integration not found, will fall back to env vars or error below
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
