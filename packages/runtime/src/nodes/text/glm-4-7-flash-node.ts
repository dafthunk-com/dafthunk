import { runWithTools } from "@cloudflare/ai-utils";
import type { NodeContext, ToolReference } from "@dafthunk/runtime";
import { ExecutableNode, ToolCallTracker } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.06,
  outputCostPerMillion: 0.4,
};

/**
 * GLM 4.7 Flash Node implementation with function calling support.
 * Returns OpenAI chat-completions format (not standard Workers AI format).
 */
export class Glm47FlashNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "glm-4-7-flash",
    name: "GLM 4.7 Flash",
    type: "glm-4-7-flash",
    description:
      "Generates text with function calling support using GLM 4.7 Flash model",
    tags: ["AI", "LLM", "Cloudflare", "GLM"],
    icon: "sparkles",
    documentation:
      "This node generates text with function calling support using Zhipu AI's GLM 4.7 Flash model. A fast and efficient multilingual model with a 131,072 token context window, optimized for dialogue, instruction-following, and multi-turn tool calling across 100+ languages.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/",
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
        description: "Maximum number of tokens to generate (includes reasoning tokens)",
        hidden: true,
        value: 2048,
      },
      {
        name: "top_p",
        type: "number",
        description: "Controls diversity via nucleus sampling (0.0 to 1.0)",
        hidden: true,
        value: 1.0,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for deterministic generation",
        hidden: true,
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
        name: "reasoning",
        type: "string",
        description: "Model's reasoning process",
        hidden: true,
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
        seed,
        frequency_penalty,
        presence_penalty,
      } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const params = {
        messages: [] as { role: string; content: string }[],
        temperature,
        max_completion_tokens: max_tokens,
        top_p,
        seed,
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
          params.messages = [{ role: "user", content: prompt }];
        }
      } else if (prompt) {
        params.messages = [{ role: "user", content: prompt }];
      } else {
        return this.createErrorResult(
          "Either prompt or messages must be provided."
        );
      }

      // Check if we have function calls to enable embedded mode
      const toolsDefinitions =
        await this.convertFunctionCallsToToolDefinitions(
          tools as ToolReference[],
          context
        );

      let result: any;
      let executedToolCalls: any[] = [];

      if (toolsDefinitions.length > 0) {
        const toolCallTracker = new ToolCallTracker();
        const trackedToolDefinitions =
          toolCallTracker.wrapToolDefinitions(toolsDefinitions);

        result = await runWithTools(
          context.env.AI as any,
          "@cf/zai-org/glm-4.7-flash",
          {
            messages: params.messages,
            tools: trackedToolDefinitions,
          } as any
        );

        executedToolCalls = toolCallTracker.getToolCalls();
      } else {
        result = await context.env.AI.run(
          "@cf/zai-org/glm-4.7-flash" as keyof AiModels,
          params as any,
          context.env.AI_OPTIONS
        );
      }

      // GLM returns OpenAI chat-completions format
      const choice = result?.choices?.[0]?.message;
      const response = choice?.content ?? "";
      const reasoning = choice?.reasoning_content ?? "";

      // Use actual token counts when available, fall back to text estimation
      const usage = result?.usage
        ? calculateTokenUsage(
            result.usage.prompt_tokens,
            result.usage.completion_tokens,
            PRICING
          )
        : calculateTokenUsage(prompt || "", response, PRICING);

      return this.createSuccessResult(
        {
          response,
          ...(reasoning ? { reasoning } : {}),
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
