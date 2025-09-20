import { NodeExecution, NodeType } from "@dafthunk/types";
import OpenAI from "openai";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * GPT-5 Nano node implementation using the OpenAI SDK
 * Ultra-lightweight, high-speed model
 */
export class Gpt5NanoNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    type: "gpt-5-nano",
    description: "Ultra-lightweight, high-speed model",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation: `This node uses OpenAI's GPT-5 Nano model, an ultra-lightweight, high-speed model.

## Usage Example

- **Input instructions**: \`"You are a helpful assistant."\`
- **Input input**: \`"What is the weather like?"\`
- **Output**: \`"I don't have access to real-time weather data, but I can help you find weather information for your location."\``,
    computeCost: 5,
    asTool: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for GPT-5 Nano's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for GPT-5 Nano",
        required: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "Generated text response from GPT-5 Nano",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { instructions, input } = context.inputs;

      if (!context.env.OPENAI_API_KEY) {
        return this.createErrorResult("OPENAI_API_KEY is not configured");
      }

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      const client = new OpenAI({
        apiKey: context.env.OPENAI_API_KEY,
        timeout: 60000,
      });

      const completion = await client.chat.completions.create({
        model: "gpt-5-nano",
        max_tokens: 1024,
        messages: [
          ...(instructions
            ? [{ role: "system" as const, content: instructions }]
            : []),
          { role: "user" as const, content: input },
        ],
      });

      const responseText = completion.choices[0]?.message?.content || "";

      return this.createSuccessResult({
        text: responseText,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof OpenAI.APIError) {
        return this.createErrorResult(`OpenAI API error: ${error.message}`);
      }
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
