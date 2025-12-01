import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { getAnthropicConfig } from "../../utils/ai-gateway";
import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Claude 3.5 Haiku node implementation using the Anthropic SDK
 * Fastest model for simple tasks and high-volume usage
 */
export class Claude35HaikuNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-35-haiku",
    name: "Claude 3.5 Haiku",
    type: "claude-35-haiku",
    description: "Fastest Claude model for simple tasks and high-volume usage",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Haiku"],
    icon: "zap",
    documentation:
      "This node uses Anthropic's Claude 3.5 Haiku model for fast, simple tasks and high-volume usage.",
    usage: 10,
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
        description: "Generated text response from Claude 3.5 Haiku",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { instructions, input } = context.inputs;

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      // API key is injected by AI Gateway via BYOK (Bring Your Own Keys)
      const client = new Anthropic({
        apiKey: "gateway-managed",
        timeout: 60000,
        ...getAnthropicConfig(context.env),
      });

      const response = await client.messages.create({
        model: "claude-3-5-haiku-latest",
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
