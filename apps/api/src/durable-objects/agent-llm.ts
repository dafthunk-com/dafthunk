/**
 * Provider-agnostic LLM dispatch shared by the agent Durable Objects.
 *
 * Converts the generic {@link AgentMessage} history into each provider's wire
 * format, calls the model through the AI Gateway, and normalises the response
 * into an {@link LLMResponse}. Extracted so both AgentRunner and
 * EmailAgentRunner share one implementation.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ToolDefinition } from "@dafthunk/runtime";
import type { AgentProvider } from "@dafthunk/runtime/nodes/agent/base-agent-node";
import type {
  AgentMessage,
  LLMResponse,
} from "@dafthunk/runtime/utils/agent-loop";
import {
  getAnthropicConfig,
  getGoogleAIConfig,
  getOpenAIConfig,
} from "@dafthunk/runtime/utils/ai-gateway";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

import type { Bindings } from "../context";

export interface CallLLMArgs {
  provider: AgentProvider;
  model: string;
  instructions: string;
  messages: AgentMessage[];
  tools: ToolDefinition[];
  /** Provider built-in tools (e.g. Gemini googleSearch) merged with `tools`. */
  builtInTools?: Record<string, unknown>[];
  /** JSON schema constraining the output (structured output). */
  schema?: Record<string, unknown>;
}

/** Dispatch an LLM call to the configured provider. */
export function callAgentLLM(
  env: Bindings,
  args: CallLLMArgs
): Promise<LLMResponse> {
  const { provider } = args;
  switch (provider) {
    case "anthropic":
      return callAnthropic(env, args);
    case "google":
      return callGoogle(env, args);
    case "openai":
      return callOpenAI(env, args);
    case "workers-ai":
      return callWorkersAI(env, args);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// ── Anthropic ──────────────────────────────────────────────────────────────

async function callAnthropic(
  env: Bindings,
  { model, instructions, messages, tools, schema }: CallLLMArgs
): Promise<LLMResponse> {
  const client = new Anthropic({
    apiKey: "gateway-managed",
    timeout: 120_000,
    ...getAnthropicConfig(env),
  });

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => {
    if (m.role === "assistant" && m.toolCalls?.length) {
      return {
        role: "assistant" as const,
        content: [
          ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
          ...m.toolCalls.map((tc) => ({
            type: "tool_use" as const,
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          })),
        ],
      };
    }
    if (m.role === "tool") {
      return {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            tool_use_id: m.toolCallId ?? "",
            content: m.content,
          },
        ],
      };
    }
    return {
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    };
  });

  const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));

  const systemPrompt = schema
    ? `${instructions}\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(schema)}`
    : instructions;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: anthropicMessages,
    ...(systemPrompt && { system: systemPrompt }),
    ...(anthropicTools.length > 0 && { tools: anthropicTools }),
  });

  let content = "";
  const toolCalls: LLMResponse["toolCalls"] = [];
  for (const block of response.content) {
    if (block.type === "text") {
      content += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      });
    }
  }

  return {
    content,
    toolCalls,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ── Google (Gemini) ──────────────────────────────────────────────────────────

async function callGoogle(
  env: Bindings,
  { model, instructions, messages, tools, builtInTools, schema }: CallLLMArgs
): Promise<LLMResponse> {
  const ai = new GoogleGenAI({
    apiKey: "gateway-managed",
    ...getGoogleAIConfig(env),
  });

  const contents: Array<{
    role: string;
    parts: Array<Record<string, unknown>>;
  }> = [];
  for (const m of messages) {
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
    } else if (m.role === "assistant") {
      const parts: Array<Record<string, unknown>> = [];
      if (m.content) parts.push({ text: m.content });
      if (m.toolCalls) {
        for (const tc of m.toolCalls) {
          parts.push({
            functionCall: { name: tc.name, args: tc.arguments },
            ...(tc.thoughtSignature && {
              thoughtSignature: tc.thoughtSignature,
            }),
          });
        }
      }
      contents.push({ role: "model", parts });
    } else if (m.role === "tool") {
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: m.toolName,
              response: safeJsonParse(m.content),
            },
          },
        ],
      });
    }
  }

  const functionDeclarations = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  const config: Record<string, unknown> = {};
  const allTools: Record<string, unknown>[] = [...(builtInTools ?? [])];
  if (functionDeclarations.length > 0) {
    allTools.push({ functionDeclarations });
  }
  if (allTools.length > 0) {
    config.tools = allTools;
  }
  if (schema) {
    config.responseMimeType = "application/json";
    config.responseSchema = schema;
  }

  const response = await ai.models.generateContent({
    model,
    contents: contents as any,
    config: config as any,
    ...(instructions && { systemInstruction: instructions }),
  });

  let content = "";
  const toolCalls: LLMResponse["toolCalls"] = [];
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts as any[]) {
      if (part.text) {
        content += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `gemini_${geminiCallId()}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args ?? {},
          ...(part.thoughtSignature && {
            thoughtSignature: part.thoughtSignature,
          }),
        });
      }
    }
  }

  const usage = response.usageMetadata;
  return {
    content,
    toolCalls,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}

// ── OpenAI ───────────────────────────────────────────────────────────────────

async function callOpenAI(
  env: Bindings,
  { model, instructions, messages, tools, schema }: CallLLMArgs
): Promise<LLMResponse> {
  const client = new OpenAI({
    apiKey: "gateway-managed",
    timeout: 120_000,
    ...getOpenAIConfig(env),
  });

  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];
  if (instructions) {
    openaiMessages.push({ role: "system", content: instructions });
  }
  for (const m of messages) {
    if (m.role === "user") {
      openaiMessages.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      openaiMessages.push({
        role: "assistant",
        content: m.content || null,
        ...(m.toolCalls?.length && {
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        }),
      });
    } else if (m.role === "tool") {
      openaiMessages.push({
        role: "tool",
        tool_call_id: m.toolCallId ?? "",
        content: m.content,
      });
    }
  }

  const openaiTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const responseFormat = schema
    ? {
        type: "json_schema" as const,
        json_schema: { name: "response", schema, strict: true },
      }
    : undefined;

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: openaiMessages,
    ...(openaiTools.length > 0 && { tools: openaiTools }),
    ...(responseFormat && { response_format: responseFormat }),
  });

  const choice = completion.choices[0];
  const content = choice?.message?.content ?? "";
  const toolCalls: LLMResponse["toolCalls"] = [];
  if (choice?.message?.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      if (tc.type === "function") {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: safeJsonParse(tc.function.arguments),
        });
      }
    }
  }

  return {
    content,
    toolCalls,
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
  };
}

// ── Workers AI ───────────────────────────────────────────────────────────────

async function callWorkersAI(
  env: Bindings,
  { model, instructions, messages, tools, schema }: CallLLMArgs
): Promise<LLMResponse> {
  const aiMessages: Array<{ role: string; content: string }> = [];

  const systemPrompt = schema
    ? `${instructions}\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(schema)}`
    : instructions;
  if (systemPrompt) {
    aiMessages.push({ role: "system", content: systemPrompt });
  }

  for (const m of messages) {
    if (m.role === "tool") {
      aiMessages.push({
        role: "user",
        content: `Tool result for ${m.toolName}: ${m.content}`,
      });
    } else {
      aiMessages.push({ role: m.role, content: m.content });
    }
  }

  const aiTools =
    tools.length > 0
      ? tools.map((t) => ({
          type: "function" as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }))
      : undefined;

  const result = (await env.AI.run(
    model as keyof AiModels,
    {
      messages: aiMessages,
      ...(aiTools && { tools: aiTools }),
      stream: false,
    } as any
  )) as any;

  const choice = result?.choices?.[0]?.message;
  const content: string = choice?.content ?? "";
  const toolCalls: LLMResponse["toolCalls"] = [];
  if (choice?.tool_calls) {
    for (const tc of choice.tool_calls) {
      toolCalls.push({
        id: tc.id ?? `wai_${geminiCallId()}`,
        name: tc.function.name,
        arguments: safeJsonParse(tc.function.arguments),
      });
    }
  }

  const usage = result?.usage;
  return {
    content,
    toolCalls,
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a synthetic id for providers that don't return tool-call ids.
 * Uses crypto.randomUUID() — Date.now()/Math.random() are unavailable in some
 * runtime sandboxes and need not be used here.
 */
function geminiCallId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function safeJsonParse(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return { raw: value };
    }
  }
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}
