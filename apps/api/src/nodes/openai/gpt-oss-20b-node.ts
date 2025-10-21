import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * GPT-OSS-20B node implementation following Cloudflare Workers AI API
 * OpenAI's open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases
 * GPT-OSS-20B is for lower latency, and local or specialized use-cases
 */
export class GptOss20BNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-oss-20b",
    name: "GPT-OSS-20B",
    type: "gpt-oss-20b",
    description:
      "OpenAI's open-weight model for lower latency and specialized use cases",
    tags: ["AI", "LLM", "OpenAI", "GPT"],
    icon: "sparkles",
    documentation:
      "This node uses OpenAI's GPT-OSS-20B model, an open-weight model designed for lower latency and specialized use cases.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/",
    computeCost: 20,
    asTool: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for the model behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for the model",
        required: true,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response from GPT-OSS-20B",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { instructions, input } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      const result = await context.env.AI.run(
        "@cf/openai/gpt-oss-20b" as any,
        {
          instructions: instructions || "You are a helpful assistant.",
          input,
        },
        context.env.AI_OPTIONS
      );

      // Extract the response text from the output structure
      // The response is in output[1] (the message with type 'message' and role 'assistant')
      const messageOutput = result.output?.find(
        (output: any) =>
          output.type === "message" && output.role === "assistant"
      );
      const responseText = messageOutput?.content?.[0]?.text || "";

      return this.createSuccessResult({
        response: responseText,
      });
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
