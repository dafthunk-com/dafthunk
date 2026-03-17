import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeGeminiModel } from "./execute-gemini-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 1.25,
  outputCostPerMillion: 10.0,
};

export class Gemini25ProNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    type: "gemini-2-5-pro",
    description: "Most capable model for complex reasoning and creative tasks",
    tags: ["AI", "LLM", "Google", "Gemini"],
    icon: "sparkles",
    documentation:
      "This node uses Google's Gemini 2.5 Pro model, the most capable model for complex reasoning and creative tasks.",
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
        name: "temperature",
        type: "number",
        description:
          "Controls randomness (0.0-2.0). Lower values are more deterministic, higher values more creative",
        required: false,
        hidden: true,
      },
      {
        name: "maxOutputTokens",
        type: "number",
        description:
          "Maximum number of tokens in the response. Leave empty for model default",
        required: false,
        hidden: true,
      },
      {
        name: "thinking_budget",
        type: "number",
        description:
          "Thinking budget (0-1000). Higher values enable more reasoning but increase cost and latency",
        required: false,
        value: 200,
      },
      {
        name: "tools",
        type: "json",
        description: "Array of tool references for function calling",
        hidden: true,
        value: [] as any,
      },
      {
        name: "googleSearch",
        type: "boolean",
        description:
          "Enable Google Search to ground responses in current web results",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "Generated text response from Gemini 2.5 Pro",
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
        name: "grounding_metadata",
        type: "json",
        description:
          "Grounding metadata with search queries, sources, and citations from Google Search or Maps",
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
    return executeGeminiModel(this, context, {
      modelId: "gemini-2.5-pro",
      pricing: PRICING,
    });
  }
}
