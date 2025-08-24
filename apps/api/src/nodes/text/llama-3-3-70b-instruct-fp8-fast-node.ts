import { runWithTools } from "@cloudflare/ai-utils";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ToolCallTracker } from "../base-tool-registry";
import { ToolReference } from "../tool-types";
import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Llama 3.3 70B Instruct Fast Node implementation with comprehensive parameters
 */
export class Llama3370BInstructFastNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "llama-3-3-70b-instruct-fp8-fast",
    name: "Llama 3.3 70B Instruct Fast",
    type: "llama-3-3-70b-instruct-fp8-fast",
    description:
      "Generates text using Llama 3.3 70B Instruct Fast model with fp8 precision",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation: "*Missing detailed documentation*",
    computeCost: 10,
    asTool: true,
    functionCalling: true,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "The input text prompt for the LLM",
        required: true,
      },
      {
        name: "temperature",
        type: "number",
        description: "Controls randomness in the output (0.0 to 5.0)",
        hidden: true,
        value: 0.6,
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
        description: "Controls diversity via nucleus sampling (0.0 to 2.0)",
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
      {
        name: "tools",
        type: "json",
        description: "Array of tool references for function calling",
        hidden: true,
        value: [] as any,
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
        messages, // Note: messages is declared but not used if params.stream is always false and no messages input handling
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

      const params: Ai_Cf_Meta_Llama_3_3_70B_Instruct_Fp8_Fast_Input = {
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
          // Optionally, handle the error, e.g., by falling back to prompt or returning an error result
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

      // Add tools/functions if tools array is provided
      const toolsDefinitions = await this.convertFunctionCallsToToolDefinitions(
        tools as ToolReference[],
        context
      );

      let result: AiTextGenerationOutput;
      let executedToolCalls: any[] = [];

      if (toolsDefinitions.length > 0) {
        const toolCallTracker = new ToolCallTracker();
        const trackedToolDefinitions =
          toolCallTracker.wrapToolDefinitions(toolsDefinitions);

        result = await runWithTools(
          // @ts-ignore
          context.env.AI,
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          {
            messages: params.messages,
            tools: trackedToolDefinitions,
          }
        );

        executedToolCalls = toolCallTracker.getToolCalls();
      } else {
        result = (await context.env.AI.run(
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          params,
          context.env.AI_OPTIONS
        )) as AiTextGenerationOutput;
      }

      return this.createSuccessResult({
        response: result.response,
        ...(executedToolCalls.length > 0
          ? { tool_calls: executedToolCalls }
          : {}),
      });
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
