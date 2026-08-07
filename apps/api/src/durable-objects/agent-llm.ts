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
  /**
   * Output ceiling for this call.
   *
   * A single number for every caller does not work: a chat turn is a few
   * hundred tokens and a workflow draft is thousands. Too low is worse than
   * slow — the model stops mid-object and the caller receives a document that
   * looks complete enough to try parsing.
   */
  maxTokens?: number;
}

/** Conservative default for conversational turns. */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Thrown when the model ran out of output budget mid-answer.
 *
 * Its own error type because the fix is completely different from a model
 * mistake: nothing about the prompt is wrong, there was simply not enough room.
 * Without this the truncated body reaches a JSON parser, which reports a syntax
 * error at whatever position the text happened to stop — sending whoever reads
 * the logs looking for a malformed value that does not exist.
 */
export class TruncatedResponseError extends Error {
  constructor(maxTokens: number) {
    super(
      `The model hit its ${maxTokens}-token output limit before finishing. The answer was cut off, not malformed.`
    );
    this.name = "TruncatedResponseError";
  }
}

/** Name of the synthetic tool used to constrain output to a schema. */
const STRUCTURED_OUTPUT_TOOL = "respond_with_result";

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
  { model, instructions, messages, tools, schema, maxTokens }: CallLLMArgs
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

  /**
   * Anthropic constrains decoding through tool input, not a response-format
   * field: a tool whose `input_schema` is the schema, forced with
   * `tool_choice`, comes back as a `tool_use` block whose input is guaranteed
   * to match. That is a real constraint, unlike pasting the schema into the
   * system prompt and asking nicely — which is what this did before, and which
   * leaves every fenced-code-block and stray-preamble failure on the table.
   *
   * Only when the caller wants a schema and has no tools of its own. Mixing a
   * forced response tool with real ones would stop the model calling those.
   */
  const useStructuredOutput = Boolean(schema) && anthropicTools.length === 0;

  const structuredTool: Anthropic.Tool[] = useStructuredOutput
    ? [
        {
          name: STRUCTURED_OUTPUT_TOOL,
          description: "Return the result. Always use this tool.",
          input_schema: schema as Anthropic.Tool.InputSchema,
        },
      ]
    : [];

  // Kept only for the unconstrained path; with a forced tool the schema is
  // enforced by decoding and restating it just spends input tokens.
  const systemPrompt =
    schema && !useStructuredOutput
      ? `${instructions}\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(schema)}`
      : instructions;

  const limit = maxTokens ?? DEFAULT_MAX_TOKENS;

  const response = await client.messages.create({
    model,
    max_tokens: limit,
    messages: anthropicMessages,
    ...(systemPrompt && { system: systemPrompt }),
    ...(useStructuredOutput
      ? {
          tools: structuredTool,
          tool_choice: { type: "tool" as const, name: STRUCTURED_OUTPUT_TOOL },
        }
      : anthropicTools.length > 0 && { tools: anthropicTools }),
  });

  // Checked before reading the body. A truncated answer is not a malformed
  // one, and letting it reach a JSON parser turns "ran out of room" into a
  // syntax error at a position that means nothing to anybody.
  if (response.stop_reason === "max_tokens") {
    throw new TruncatedResponseError(limit);
  }

  let content = "";
  const toolCalls: LLMResponse["toolCalls"] = [];
  for (const block of response.content) {
    if (block.type === "text") {
      content += block.text;
    } else if (block.type === "tool_use") {
      if (block.name === STRUCTURED_OUTPUT_TOOL) {
        // Handed back as text so callers keep one code path whether or not the
        // provider was able to constrain decoding.
        content += JSON.stringify(block.input);
        continue;
      }
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
  {
    model,
    instructions,
    messages,
    tools,
    builtInTools,
    schema,
    maxTokens,
  }: CallLLMArgs
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
  config.maxOutputTokens = maxTokens ?? DEFAULT_MAX_TOKENS;

  const response = await ai.models.generateContent({
    model,
    contents: contents as any,
    config: config as any,
    ...(instructions && { systemInstruction: instructions }),
  });

  if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new TruncatedResponseError(maxTokens ?? DEFAULT_MAX_TOKENS);
  }

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
  { model, instructions, messages, tools, schema, maxTokens }: CallLLMArgs
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
    max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: openaiMessages,
    ...(openaiTools.length > 0 && { tools: openaiTools }),
    ...(responseFormat && { response_format: responseFormat }),
  });

  const choice = completion.choices[0];
  const content = choice?.message?.content ?? "";
  const toolCalls: LLMResponse["toolCalls"] = [];
  if (choice?.finish_reason === "length") {
    throw new TruncatedResponseError(maxTokens ?? DEFAULT_MAX_TOKENS);
  }

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

  const { content, toolCalls } = readWorkersAiReply(result);

  const usage = result?.usage;
  return {
    content,
    toolCalls,
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
  };
}

/**
 * Tool calls emitted as text, which is how several Workers AI models answer.
 *
 * Qwen and the other Hermes-template models write the call into the reply
 * itself rather than into a structured field. `runWithTools` — the path the
 * shipped templates use — knows this; the agent loop reads the response by hand
 * and did not, so the call arrived as prose and the agent delivered its own
 * tool syntax to the reader instead of ever running anything.
 */
const TOOL_CALL_BLOCK = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;

/** Arguments arrive as a JSON string from some providers and an object from others. */
function readArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") return safeJsonParse(raw);
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

/**
 * One tool call, from whichever of the three shapes it arrived in.
 *
 * `{ function: { name, arguments } }` is the OpenAI shape; `{ name, arguments }`
 * is what Workers AI puts in its top-level `tool_calls`. Neither is a variant of
 * the other and both turn up depending on the model.
 */
function readToolCall(
  raw: unknown
): { name: string; arguments: Record<string, unknown> } | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const entry = raw as {
    name?: unknown;
    arguments?: unknown;
    function?: { name?: unknown; arguments?: unknown };
  };

  const name = entry.function?.name ?? entry.name;
  if (typeof name !== "string" || name === "") return undefined;

  return {
    name,
    arguments: readArguments(entry.function?.arguments ?? entry.arguments),
  };
}

/**
 * The assistant's reply, read the way Workers AI actually answers.
 *
 * Three places carry tool calls and a given model uses exactly one of them:
 * the OpenAI-shaped `choices[0].message.tool_calls`, the Workers AI top-level
 * `tool_calls`, or `<tool_call>` blocks inside the text. Reading only the first
 * is why a tool-equipped agent on Workers AI never called anything — it saw no
 * calls, treated the reply as final, and handed the raw syntax to the user.
 *
 * Text-borne calls are stripped from the content as they are collected, so what
 * remains is what the model meant to say rather than its plumbing.
 */
export function readWorkersAiReply(result: unknown): {
  content: string;
  toolCalls: NonNullable<LLMResponse["toolCalls"]>;
} {
  const reply = (result ?? {}) as {
    response?: unknown;
    tool_calls?: unknown;
    choices?: Array<{ message?: { content?: unknown; tool_calls?: unknown } }>;
  };

  const message = reply.choices?.[0]?.message;
  let content =
    typeof message?.content === "string"
      ? message.content
      : typeof reply.response === "string"
        ? reply.response
        : "";

  const structured = [
    ...(Array.isArray(message?.tool_calls) ? message.tool_calls : []),
    ...(Array.isArray(reply.tool_calls) ? reply.tool_calls : []),
  ];

  const toolCalls: NonNullable<LLMResponse["toolCalls"]> = [];
  for (const raw of structured) {
    const call = readToolCall(raw);
    if (!call) continue;
    toolCalls.push({
      id: (raw as { id?: string }).id ?? `wai_${geminiCallId()}`,
      name: call.name,
      arguments: call.arguments,
    });
  }

  // Only when nothing structured came back: a model that filled the field has
  // no reason to also write the call out, and parsing prose that merely quotes
  // the syntax would invent a call nobody asked for.
  if (toolCalls.length === 0 && content.includes("<tool_call>")) {
    for (const [, body] of content.matchAll(TOOL_CALL_BLOCK)) {
      const call = readToolCall(safeJsonParse(body));
      if (!call) continue;
      toolCalls.push({
        id: `wai_${geminiCallId()}`,
        name: call.name,
        arguments: call.arguments,
      });
    }

    if (toolCalls.length > 0) {
      content = content.replace(TOOL_CALL_BLOCK, "").trim();
    }
  }

  return { content, toolCalls };
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
