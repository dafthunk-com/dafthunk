import { NodeExecution, NodeType } from "@dafthunk/types";
import OpenAI from "openai";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * GPT-5 node implementation using the OpenAI SDK
 * Next-generation flagship model
 */
export class Gpt5Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-5",
    name: "GPT-5",
    type: "gpt-5",
    description: "Next-generation flagship model",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation: `This node uses OpenAI's GPT-5 model to generate text responses based on input prompts.

## Usage Example

- **Input instructions**: \`"You are a helpful coding assistant."\`
- **Input input**: \`"Write a function to calculate the factorial of a number in JavaScript."\`
- **Output**: 
\`\`\`
Here's a JavaScript function to calculate factorial:

function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
\`\`\``,
    computeCost: 35,
    asTool: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for GPT-5's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for GPT-5",
        required: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "Generated text response from GPT-5",
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
        model: "gpt-5",
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
