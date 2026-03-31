import type { NodeContext, ToolReference } from "@dafthunk/runtime";
import type { NodeExecution, Schema } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";
import { getGoogleAIConfig } from "../../utils/ai-gateway";
import { schemaToJsonSchema } from "../../utils/schema-to-json-schema";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

interface GeminiModelConfig {
  modelId: string;
  pricing: TokenPricing;
}

/**
 * Shared execution logic for all Gemini text-generation nodes with
 * function-calling support. Centralizes SDK setup, config building,
 * the tool-call-execute-respond loop, response extraction, and usage
 * calculation.
 */
export async function executeGeminiModel(
  node: {
    createSuccessResult: (
      outputs: Record<string, unknown>,
      usage: number
    ) => NodeExecution;
    createErrorResult: (error: string) => NodeExecution;
    convertFunctionCallsToGeminiDeclarations: (
      tools: ToolReference[],
      context: NodeContext
    ) => Promise<
      Array<{ name: string; description: string; parameters: unknown }>
    >;
  },
  context: NodeContext,
  config: GeminiModelConfig
): Promise<NodeExecution> {
  try {
    const {
      instructions,
      input,
      temperature,
      maxOutputTokens,
      thinking_budget,
      tools,
      googleSearch,
      schema: schemaInput,
    } = context.inputs;

    if (!input) {
      return node.createErrorResult("Input is required");
    }

    const ai = new GoogleGenAI({
      apiKey: "gateway-managed",
      ...getGoogleAIConfig(context.env),
    });

    const genConfig: Record<string, unknown> = {};

    if (temperature !== undefined && temperature !== null) {
      genConfig.temperature = temperature;
    }
    if (maxOutputTokens !== undefined && maxOutputTokens !== null) {
      genConfig.maxOutputTokens = maxOutputTokens;
    }
    if (thinking_budget !== undefined && thinking_budget !== null) {
      genConfig.thinkingConfig = { thinkingBudget: thinking_budget };
    }

    // Add structured output when a schema is provided
    if (
      schemaInput &&
      typeof schemaInput === "object" &&
      "fields" in schemaInput
    ) {
      genConfig.responseMimeType = "application/json";
      genConfig.responseSchema = schemaToJsonSchema(schemaInput as Schema);
    }

    const functionDeclarations =
      await node.convertFunctionCallsToGeminiDeclarations(
        tools as ToolReference[],
        context
      );

    // Build built-in tools array
    const builtInTools: Record<string, unknown>[] = [];
    if (googleSearch) builtInTools.push({ googleSearch: {} });

    let response: any;
    const executedToolCalls: any[] = [];
    let intermediaryMessages: any[] = [];

    // Merge function declarations with built-in tools
    const allTools: Record<string, unknown>[] = [...builtInTools];
    if (functionDeclarations.length > 0) {
      allTools.push({ functionDeclarations });
    }

    if (allTools.length > 0) {
      genConfig.tools = allTools;
    }

    if (functionDeclarations.length > 0) {
      response = await ai.models.generateContent({
        model: config.modelId,
        contents: [{ text: input }],
        config: genConfig,
        ...(instructions && { systemInstruction: instructions }),
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.functionCall) {
            executedToolCalls.push({
              name: part.functionCall.name,
              arguments: part.functionCall.args,
            });
          }
        }
      }

      if (executedToolCalls.length > 0) {
        const functionResults = await executeToolCalls(
          executedToolCalls,
          tools as ToolReference[],
          context
        );

        const functionResultsText = functionResults
          .map((fr) => `${fr.name}: ${JSON.stringify(fr.result)}`)
          .join("\n");

        const finalPrompt = `${input}\n\nFunction results:\n${functionResultsText}`;

        intermediaryMessages = [
          { type: "initial_function_calls", calls: executedToolCalls },
          { type: "function_results", results: functionResults },
          { type: "final_prompt", prompt: finalPrompt },
        ];

        response = await ai.models.generateContent({
          model: config.modelId,
          contents: [{ text: finalPrompt }],
          config: {
            ...(thinking_budget !== undefined &&
              thinking_budget !== null && {
                thinkingConfig: { thinkingBudget: thinking_budget },
              }),
          },
          ...(instructions && { systemInstruction: instructions }),
        });
      }
    } else {
      response = await ai.models.generateContent({
        model: config.modelId,
        contents: [{ text: input }],
        config: genConfig,
        ...(instructions && { systemInstruction: instructions }),
      });
    }

    let responseText = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          responseText += part.text;
        }
      }
    }

    let finalText = responseText;
    if (executedToolCalls.length > 0 && !responseText) {
      finalText = `I'll help you with that. I'm calling the ${executedToolCalls[0].name} function.`;
    }

    const candidate = response.candidates?.[0];
    const usageMetadata = response.usageMetadata;
    const promptFeedback = response.promptFeedback;
    const finishReason = candidate?.finishReason;
    const groundingMetadata = candidate?.groundingMetadata;

    const usage = calculateTokenUsage(
      usageMetadata?.promptTokenCount ?? 0,
      usageMetadata?.candidatesTokenCount ?? 0,
      config.pricing
    );

    return node.createSuccessResult(
      {
        text: finalText,
        ...(candidate && { candidates: [candidate] }),
        ...(usageMetadata && { usage_metadata: usageMetadata }),
        ...(promptFeedback && { prompt_feedback: promptFeedback }),
        ...(finishReason && { finish_reason: finishReason }),
        ...(groundingMetadata && { grounding_metadata: groundingMetadata }),
        ...(executedToolCalls.length > 0
          ? { tool_calls: executedToolCalls }
          : {}),
        ...(intermediaryMessages.length > 0
          ? { intermediary_messages: intermediaryMessages }
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

async function executeToolCalls(
  toolCalls: Array<{ name: string; arguments: unknown }>,
  tools: ToolReference[],
  context: NodeContext
): Promise<Array<{ name: string; result: unknown }>> {
  const results = [];
  for (const toolCall of toolCalls) {
    try {
      const toolRef = tools.find((t: ToolReference) => {
        const toolName = `node_${t.identifier}`;
        return toolName === toolCall.name;
      });

      if (toolRef && context.toolRegistry) {
        const result = await context.toolRegistry.executeTool(
          toolRef,
          toolCall.arguments
        );
        results.push({
          name: toolCall.name,
          result: result.success ? result.result : { error: result.error },
        });
      } else {
        results.push({
          name: toolCall.name,
          result: { error: "Tool not found or tool registry not available" },
        });
      }
    } catch (error) {
      results.push({
        name: toolCall.name,
        result: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }
  return results;
}
