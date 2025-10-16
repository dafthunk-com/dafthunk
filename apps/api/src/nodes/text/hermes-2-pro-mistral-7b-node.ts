import { runWithTools } from "@cloudflare/ai-utils";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ToolCallTracker } from "../base-tool-registry";
import { ToolReference } from "../tool-types";
import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Hermes 2 Pro Mistral 7B Node implementation with function calling support
 */
export class Hermes2ProMistral7BNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "hermes-2-pro-mistral-7b",
    name: "Hermes 2 Pro Mistral 7B",
    type: "hermes-2-pro-mistral-7b",
    description:
      "Generates text with function calling support using Hermes 2 Pro Mistral 7B model",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation:
      "This node generates text with function calling support using Nous Research's Hermes 2 Pro Mistral 7B model.",
    referenceUrl: "https://developers.cloudflare.com/workers-ai/models/hermes-2-pro-mistral-7b/",
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
        name: "messages",
        type: "string",
        description: "JSON string of conversation messages",
        hidden: true,
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
      const params: AiTextGenerationInput = {
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

      let result: AiTextGenerationOutput;
      let executedToolCalls: any[] = [];

      if (toolsDefinitions.length > 0) {
        const toolCallTracker = new ToolCallTracker();
        const trackedToolDefinitions =
          toolCallTracker.wrapToolDefinitions(toolsDefinitions);

        result = await runWithTools(
          // @ts-ignore
          context.env.AI,
          "@hf/nousresearch/hermes-2-pro-mistral-7b",
          {
            messages: params.messages,
            tools: trackedToolDefinitions,
          }
        );

        executedToolCalls = toolCallTracker.getToolCalls();
      } else {
        result = await context.env.AI.run(
          "@hf/nousresearch/hermes-2-pro-mistral-7b",
          params,
          context.env.AI_OPTIONS
        );
      }

      return this.createSuccessResult({
        response: result.response || "",
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
