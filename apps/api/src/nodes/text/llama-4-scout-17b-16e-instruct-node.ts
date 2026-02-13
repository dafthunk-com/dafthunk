import { runWithTools } from "@cloudflare/ai-utils";
import type { NodeContext, ToolReference } from "@dafthunk/runtime";
import { ExecutableNode, ToolCallTracker } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: ~$0.011 per 1000 neurons, estimated for 17B MoE model
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.15,
  outputCostPerMillion: 0.3,
};

/**
 * Llama 4 Scout 17B 16E Instruct Node implementation with function calling support
 */
export class Llama4Scout17B16EInstructNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B 16E Instruct",
    type: "llama-4-scout-17b-16e-instruct",
    description:
      "Generates text with function calling support using Llama 4 Scout 17B 16E Instruct model",
    tags: ["AI", "LLM", "Cloudflare", "Llama"],
    icon: "sparkles",
    documentation:
      "This node generates text with function calling support using Meta's Llama 4 Scout 17B 16E Instruct model.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/",
    usage: 1,
    functionCalling: true,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "The input text prompt for the LLM",
        required: true,
      },
      {
        name: "messages",
        type: "string",
        description: "JSON string of conversation messages",
        required: false,
      },
      {
        name: "tools",
        type: "json",
        description: "Array of tool references for function calling",
        hidden: true,
        value: [] as any,
      },
      {
        name: "temperature",
        type: "number",
        description: "Controls randomness in the output (0.0 to 2.0)",
        hidden: true,
        value: 0.7,
      },
      {
        name: "max_tokens",
        type: "number",
        description: "Maximum number of tokens to generate",
        hidden: true,
        value: 256,
      },
      {
        name: "top_p",
        type: "number",
        description: "Controls diversity via nucleus sampling (0.0 to 1.0)",
        hidden: true,
        value: 1.0,
      },
      {
        name: "top_k",
        type: "number",
        description: "Controls diversity via top-k sampling (1 to 50)",
        hidden: true,
        value: 40,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for deterministic generation",
        hidden: true,
      },
      {
        name: "repetition_penalty",
        type: "number",
        description: "Penalty for repeated tokens (0.0 to 2.0)",
        hidden: true,
        value: 1.0,
      },
      {
        name: "frequency_penalty",
        type: "number",
        description: "Penalty for frequency of tokens (0.0 to 2.0)",
        hidden: true,
        value: 0.0,
      },
      {
        name: "presence_penalty",
        type: "number",
        description: "Penalty for presence of tokens (0.0 to 2.0)",
        hidden: true,
        value: 0.0,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response",
      },
      {
        name: "tool_calls",
        type: "json",
        description: "Function calls made by the model",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        prompt,
        messages,
        tools,
        temperature,
        max_tokens,
        top_p,
        top_k,
        seed,
        repetition_penalty,
        frequency_penalty,
        presence_penalty,
      } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const params: Ai_Cf_Meta_Llama_4_Scout_17B_16E_Instruct_Input = {
        messages: [],
        temperature,
        max_tokens,
        top_p,
        top_k,
        seed,
        repetition_penalty,
        frequency_penalty,
        presence_penalty,
        stream: false,
      };

      // If messages are provided, use them, otherwise use prompt
      if (messages && typeof messages === "string") {
        try {
          params.messages = JSON.parse(messages);
        } catch (e) {
          console.error("Failed to parse messages JSON string:", e);
          // Fall back to prompt
          params.messages = [
            {
              role: "user",
              content: prompt,
            },
          ];
        }
      } else if (prompt) {
        params.messages = [
          {
            role: "user",
            content: prompt,
          },
        ];
      } else {
        return this.createErrorResult(
          "Either prompt or messages must be provided."
        );
      }

      // Check if we have function calls to enable embedded mode
      const toolsDefinitions = await this.convertFunctionCallsToToolDefinitions(
        tools as ToolReference[],
        context
      );

      let result:
        | Ai_Cf_Meta_Llama_4_Scout_17B_16E_Instruct_Output
        | AiTextGenerationOutput;
      let executedToolCalls: any[] = [];

      if (toolsDefinitions.length > 0) {
        const toolCallTracker = new ToolCallTracker();
        const trackedToolDefinitions =
          toolCallTracker.wrapToolDefinitions(toolsDefinitions);

        result = await runWithTools(
          // @ts-ignore
          context.env.AI,
          "@cf/meta/llama-4-scout-17b-16e-instruct",
          {
            messages: params.messages,
            tools: trackedToolDefinitions,
          }
        );

        executedToolCalls = toolCallTracker.getToolCalls();
      } else {
        result = await context.env.AI.run(
          "@cf/meta/llama-4-scout-17b-16e-instruct",
          params,
          context.env.AI_OPTIONS
        );
      }

      // Calculate usage based on text length estimation
      const usage = calculateTokenUsage(
        prompt || "",
        result.response || "",
        PRICING
      );

      return this.createSuccessResult(
        {
          response: result.response,
          ...(executedToolCalls.length > 0
            ? { tool_calls: executedToolCalls }
            : {}),
        },
        usage
      );
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
