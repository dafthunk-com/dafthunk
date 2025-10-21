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
    tags: ["AI", "LLM", "OpenAI", "GPT"],
    icon: "sparkles",
    documentation:
      "This node uses OpenAI's GPT-5 model to generate text responses based on input prompts.",
    computeCost: 35,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "OpenAI integration to use",
        hidden: true,
        required: false,
      },
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
      const { integrationId, instructions, input } = context.inputs;

      // Get API key from integration
      let openaiApiKey: string | undefined;

      if (integrationId && typeof integrationId === "string") {
        const integration = context.integrations?.[integrationId];
        if (integration?.provider === "openai") {
          openaiApiKey = integration.token;
        }
      }

      if (!openaiApiKey) {
        return this.createErrorResult(
          "OpenAI integration is required. Please connect an OpenAI integration."
        );
      }

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      const client = new OpenAI({
        apiKey: openaiApiKey,
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
