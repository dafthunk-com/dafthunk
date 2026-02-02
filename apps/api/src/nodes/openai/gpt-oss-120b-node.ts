import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.35,
  outputCostPerMillion: 0.75,
};

/**
 * GPT-OSS-120B node implementation following Cloudflare Workers AI API
 * OpenAI's open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases
 */
export class GptOss120BNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-oss-120b",
    name: "GPT-OSS-120B",
    type: "gpt-oss-120b",
    description:
      "OpenAI's open-weight model for powerful reasoning and agentic tasks",
    tags: ["AI", "LLM", "OpenAI", "GPT"],
    icon: "sparkles",
    documentation:
      "This node uses OpenAI's GPT-OSS-120B model, an open-weight model designed for powerful reasoning and agentic tasks.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/",
    usage: 1,
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
        description: "Generated text response from GPT-OSS-120B",
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
        "@cf/openai/gpt-oss-120b" as any,
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

      // Calculate usage (estimates tokens since Cloudflare doesn't provide counts)
      const usage = calculateTokenUsage(
        (instructions || "") + input,
        responseText,
        PRICING
      );

      return this.createSuccessResult({ response: responseText }, usage);
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
