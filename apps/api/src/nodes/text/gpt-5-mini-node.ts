import { NodeExecution, NodeType } from "@dafthunk/types";
import OpenAI from "openai";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * GPT-5 Mini node implementation using the OpenAI SDK
 * Faster, cost-effective version of GPT-5
 */
export class Gpt5MiniNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    type: "gpt-5-mini",
    description: "Faster, cost-effective version of GPT-5",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation: "*Missing detailed documentation*",
    computeCost: 15,
    asTool: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for GPT-5 Mini's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for GPT-5 Mini",
        required: true,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response from GPT-5 Mini",
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
        model: "gpt-5-mini",
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
        response: responseText,
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
