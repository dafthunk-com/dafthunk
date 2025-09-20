import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Claude Opus 4.1 node implementation using the Anthropic SDK
 * Most advanced Claude model with latest capabilities
 */
export class ClaudeOpus41Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-opus-41",
    name: "Claude Opus 4.1",
    type: "claude-opus-41",
    description: "Most advanced Claude model with latest capabilities",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation: `This node uses Anthropic's Claude Opus 4.1 model, the most advanced Claude model with latest capabilities.

## Usage Example

- **Input instructions**: \`"You are a helpful assistant."\`
- **Input input**: \`"Create a comprehensive business plan for a tech startup."\`
- **Output**: \`"Here's a comprehensive business plan for your tech startup..."\``,
    computeCost: 70,
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
        description: "Generated text response from Claude Opus 4.1",
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
        model: "claude-opus-4-1",
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
