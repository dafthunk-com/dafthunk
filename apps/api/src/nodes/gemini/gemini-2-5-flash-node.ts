import { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { getGoogleAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";
import { ToolReference } from "../tool-types";

// https://ai.google.dev/pricing
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.3,
  outputCostPerMillion: 2.5,
};

/**
 * Gemini 2.5 Flash node implementation using the Google GenAI SDK
 * Fast, efficient model for most use cases
 */
export class Gemini25FlashNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-flash",
    name: "Gemini 2.5 Flash",
    type: "gemini-2-5-flash",
    description: "Fast, efficient model for most use cases",
    tags: ["AI", "LLM", "Google", "Gemini"],
    icon: "sparkles",
    documentation:
      "This node uses Google's Gemini 2.5 Flash model to generate text responses based on input prompts.",
    usage: 1,
    functionCalling: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for Gemini's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for Gemini",
        required: true,
      },
      {
        name: "thinking_budget",
        type: "number",
        description:
          "Thinking budget (0-1000). Higher values enable more reasoning but increase cost and latency",
        required: false,
        value: 100,
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
        name: "text",
        type: "string",
        description: "Generated text response from Gemini 2.5 Flash",
      },
      {
        name: "candidates",
        type: "json",
        description: "Full response candidates from Gemini API",
        hidden: true,
      },
      {
        name: "usage_metadata",
        type: "json",
        description: "Token usage and cost information",
        hidden: true,
      },
      {
        name: "prompt_feedback",
        type: "json",
        description: "Feedback about the prompt quality and safety",
        hidden: true,
      },
      {
        name: "finish_reason",
        type: "string",
        description:
          "Reason why the generation finished (STOP, MAX_TOKENS, etc.)",
        hidden: true,
      },
      {
        name: "tool_calls",
        type: "json",
        description: "Function calls made by the model",
        hidden: true,
      },
      {
        name: "intermediary_messages",
        type: "json",
        description: "Intermediate messages and function results for debugging",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { instructions, input, thinking_budget, tools } = context.inputs;

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      // API key is injected by AI Gateway via BYOK (Bring Your Own Keys)
      const ai = new GoogleGenAI({
        apiKey: "gateway-managed",
        ...getGoogleAIConfig(context.env),
      });

      const config: any = {};

      // Configure thinking budget if provided
      if (thinking_budget !== undefined && thinking_budget !== null) {
        config.thinkingConfig = {
          thinkingBudget: thinking_budget,
        };
      }

      // Add tools/functions if tools array is provided
      const functionDeclarations =
        await this.convertFunctionCallsToGeminiDeclarations(
          tools as ToolReference[],
          context
        );

      let response: any;
      const executedToolCalls: any[] = [];
      let intermediaryMessages: any[] = [];

      if (functionDeclarations.length > 0) {
        config.tools = [{ functionDeclarations }];

        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ text: input }],
          config,
          ...(instructions && { systemInstruction: instructions }),
        });

        // Check for function calls in the response
        // Gemini returns functionCall in the parts array
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

        // If we have function calls, execute them and get a final response
        if (executedToolCalls.length > 0) {
          // Execute each function call
          const functionResults = [];
          for (const toolCall of executedToolCalls) {
            try {
              // Find the tool reference that matches this function call
              const toolRef = (tools as ToolReference[]).find(
                (t: ToolReference) => {
                  const toolName = `node_${t.identifier}`;
                  return toolName === toolCall.name;
                }
              );

              if (toolRef && context.toolRegistry) {
                const result = await context.toolRegistry.executeTool(
                  toolRef,
                  toolCall.arguments
                );
                functionResults.push({
                  name: toolCall.name,
                  result: result.success
                    ? result.result
                    : { error: result.error },
                });
              } else {
                functionResults.push({
                  name: toolCall.name,
                  result: {
                    error: "Tool not found or tool registry not available",
                  },
                });
              }
            } catch (error) {
              functionResults.push({
                name: toolCall.name,
                result: {
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                },
              });
            }
          }

          // Send the function results back to Gemini for a final response
          const functionResultsText = functionResults
            .map((fr) => `${fr.name}: ${JSON.stringify(fr.result)}`)
            .join("\n");

          const finalPrompt = `${input}\n\nFunction results:\n${functionResultsText}`;

          // Collect intermediary messages for debugging
          intermediaryMessages = [
            {
              type: "initial_function_calls",
              calls: executedToolCalls,
            },
            {
              type: "function_results",
              results: functionResults,
            },
            {
              type: "final_prompt",
              prompt: finalPrompt,
            },
          ];

          const finalResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text: finalPrompt }],
            config: {
              ...(thinking_budget !== undefined &&
                thinking_budget !== null && {
                  thinkingConfig: { thinkingBudget: thinking_budget },
                }),
            },
            ...(instructions && { systemInstruction: instructions }),
          });

          // Use the final response
          response = finalResponse;
        }
      } else {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ text: input }],
          config,
          ...(instructions && { systemInstruction: instructions }),
        });
      }

      // Extract text from response parts, excluding function calls
      let responseText = "";
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            responseText += part.text;
          }
        }
      }

      // If we have tool calls but no text, provide a default message
      let finalText = responseText;
      if (executedToolCalls.length > 0 && !responseText) {
        finalText = `I'll help you with that. I'm calling the ${executedToolCalls[0].name} function.`;
      }

      // Extract Gemini-specific metadata
      const candidate = response.candidates?.[0];
      const usageMetadata = response.usageMetadata;
      const promptFeedback = response.promptFeedback;
      const finishReason = candidate?.finishReason;

      // Calculate usage based on token counts
      const usage = calculateTokenUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        PRICING
      );

      return this.createSuccessResult(
        {
          text: finalText,
          ...(candidate && { candidates: [candidate] }),
          ...(usageMetadata && { usage_metadata: usageMetadata }),
          ...(promptFeedback && { prompt_feedback: promptFeedback }),
          ...(finishReason && { finish_reason: finishReason }),
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
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
