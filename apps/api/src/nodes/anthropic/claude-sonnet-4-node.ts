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
    documentation: `This node uses Anthropic's Claude Sonnet 4 model to generate text responses based on input prompts.

## Usage Example

- **Input instructions**: \`"You are a helpful writing assistant."\`
- **Input input**: \`"Write a short story about a robot learning to paint."\`
- **Output**: \`"In a sunlit studio, Robot-7 held a brush for the first time. Its metallic fingers trembled as it dipped the bristles into vibrant red paint..."\``,
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
        name: "text",
        type: "string",
        description: "Generated text response from Claude Sonnet 4",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { instructions, input, apiKey } = context.inputs;

      // Use provided API key secret or fallback to environment variable
      const anthropicApiKey = (apiKey && context.secrets?.[apiKey]) || context.env.ANTHROPIC_API_KEY;
      
      if (!anthropicApiKey) {
        return this.createErrorResult("Anthropic API key is required. Provide via apiKey input or ANTHROPIC_API_KEY environment variable");
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
