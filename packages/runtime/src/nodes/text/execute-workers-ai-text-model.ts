import { runWithTools } from "@cloudflare/ai-utils";
import type { NodeContext, ToolReference } from "@dafthunk/runtime";
import { type ExecutableNode, ToolCallTracker } from "@dafthunk/runtime";
import type { NodeExecution, Schema } from "@dafthunk/types";
import { schemaToJsonSchema } from "../../utils/schema-to-json-schema";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

/**
 * Configuration for a Workers AI text generation model.
 */
interface WorkersAiTextConfig {
  modelId: string;
  pricing: TokenPricing;
  /** Extra params for AI.run (temperature, max_tokens, etc.) */
  params?: Record<string, unknown>;
}

/**
 * Shared execution logic for all Cloudflare Workers AI text generation nodes.
 * Handles message parsing, tool calling via runWithTools, response extraction,
 * and usage calculation. Auto-detects standard ({ response }) and OpenAI
 * chat-completions ({ choices[0].message }) response formats.
 *
 * Nodes provide their model ID, pricing, and model-specific params.
 * The helper reads prompt, messages, and tools from context.inputs.
 */
export async function executeWorkersAiTextModel(
  node: ExecutableNode,
  context: NodeContext,
  config: WorkersAiTextConfig
): Promise<NodeExecution> {
  try {
    const { prompt, messages, tools, schema: schemaInput } = context.inputs;

    if (!context.env?.AI) {
      return node.createErrorResult("AI service is not available");
    }

    // Build messages array from prompt or messages input
    let parsedMessages: Array<{ role: string; content: string }> | undefined;

    if (messages && typeof messages === "string") {
      try {
        parsedMessages = JSON.parse(messages);
      } catch {
        parsedMessages = [{ role: "user", content: prompt }];
      }
    } else if (prompt) {
      parsedMessages = [{ role: "user", content: prompt }];
    }

    // Resolve tool definitions if provided
    const toolDefinitions = await node.convertFunctionCallsToToolDefinitions(
      tools as ToolReference[],
      context
    );

    // When schema is provided, prepend a JSON constraint to messages
    // (Workers AI models don't reliably support response_format)
    const extraParams: Record<string, unknown> = { ...(config.params ?? {}) };
    if (
      schemaInput &&
      typeof schemaInput === "object" &&
      "fields" in schemaInput &&
      parsedMessages
    ) {
      const jsonSchema = schemaToJsonSchema(schemaInput as Schema);
      parsedMessages = [
        {
          role: "system",
          content: `You MUST respond with valid JSON matching this schema:\n${JSON.stringify(jsonSchema)}`,
        },
        ...parsedMessages,
      ];
    }

    let result: any;
    let executedToolCalls: any[] = [];

    if (toolDefinitions.length > 0 && parsedMessages) {
      // Function calling mode via runWithTools
      const toolCallTracker = new ToolCallTracker();
      const trackedTools = toolCallTracker.wrapToolDefinitions(toolDefinitions);

      result = await runWithTools(context.env.AI as any, config.modelId, {
        messages: parsedMessages,
        tools: trackedTools,
      } as any);

      executedToolCalls = toolCallTracker.getToolCalls();
    } else if (parsedMessages) {
      // Messages mode (no tools)
      result = await context.env.AI.run(
        config.modelId as keyof AiModels,
        { messages: parsedMessages, ...extraParams } as any,
        context.env.AI_OPTIONS
      );
    } else if (prompt) {
      // Simple prompt mode (no messages)
      result = await context.env.AI.run(
        config.modelId as keyof AiModels,
        { prompt, ...extraParams } as any,
        context.env.AI_OPTIONS
      );
    } else {
      return node.createErrorResult(
        "Either prompt or messages must be provided."
      );
    }

    // Handle streaming responses
    if (result instanceof ReadableStream) {
      const reader = result.getReader();
      const decoder = new TextDecoder();
      let streamed = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamed += decoder.decode(value);
      }
      const usage = calculateTokenUsage(prompt || "", streamed, config.pricing);
      return node.createSuccessResult({ response: streamed }, usage);
    }

    // Workers AI may return standard format ({ response }) or
    // OpenAI chat-completions format ({ choices[0].message.content })
    const choice = result?.choices?.[0]?.message;
    const response = result?.response ?? choice?.content ?? "";
    const reasoning = choice?.reasoning_content ?? "";

    const usage = result?.usage
      ? calculateTokenUsage(
          result.usage.prompt_tokens,
          result.usage.completion_tokens,
          config.pricing
        )
      : calculateTokenUsage(prompt || "", response, config.pricing);

    return node.createSuccessResult(
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
    return node.createErrorResult(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
