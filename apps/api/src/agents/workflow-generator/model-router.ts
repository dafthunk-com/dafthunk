import type { AgentProvider } from "@dafthunk/runtime/nodes/agent/base-agent-node";

import type { Bindings } from "../../context";
import { callAgentLLM } from "../../durable-objects/agent-llm";
import type { ModelTier } from "./config";
import { GENERATOR_MAX_TOKENS, GENERATOR_MODELS } from "./config";
import type { GenerateCall, GenerateResult } from "./pipeline";
import { DRAFT_SCHEMA } from "./prompts";

/**
 * The one place a tiered `GenerateCall` becomes a real model call.
 *
 * `pipeline.ts` takes `callLLM` as a dependency so the whole flow runs without
 * a Cloudflare environment; this is the adapter that supplies the real one.
 * Kept out of the pipeline for that reason, and shared because it had been
 * written three times — in the Durable Object, in the benchmark and in the
 * evaluation — with the drift that always follows: the benchmark pinned
 * `DRAFT_SCHEMA` unconditionally and would have constrained a brief call to the
 * workflow schema had it ever made one.
 *
 * A harness that dispatches its own way measures a path that does not ship, so
 * the value of this is not the twenty lines saved.
 */

/** A model to use instead of what the tier declares. */
export interface ModelOverride {
  provider: AgentProvider;
  model: string;
}

export type ModelOverrides = Partial<Record<ModelTier, ModelOverride>>;

const PROVIDERS: ReadonlySet<string> = new Set([
  "anthropic",
  "google",
  "openai",
  "workers-ai",
]);

/**
 * Reads `provider:model` into an override of the synthesis tier.
 *
 * Synthesis rather than both, because it is the tier the benchmark and the
 * evaluation actually measure — composing a graph out of sixty node types is
 * the expensive job and the one whose model choice is worth settling. The brief
 * tier is a different shape of work and swapping it is a separate experiment.
 *
 * Returns undefined for anything unparseable rather than throwing: the caller
 * is a harness reading a binding that is usually absent, and the sensible
 * response to a typo is to run against the configured model and say so.
 */
export function parseModelOverride(
  raw: string | undefined
): ModelOverrides | undefined {
  if (!raw) return undefined;

  const separator = raw.indexOf(":");
  if (separator <= 0) return undefined;

  const provider = raw.slice(0, separator).trim();
  const model = raw.slice(separator + 1).trim();
  if (!PROVIDERS.has(provider) || !model) return undefined;

  return { synthesis: { provider: provider as AgentProvider, model } };
}

/** What a tier resolves to for this run, after any override. */
export function resolveTier(
  tier: ModelTier,
  overrides?: ModelOverrides
): ModelOverride {
  const override = overrides?.[tier];
  if (override) return override;
  const configured = GENERATOR_MODELS[tier];
  return { provider: configured.provider, model: configured.model };
}

/**
 * Builds the `callLLM` the pipeline and the brief turn both take.
 *
 * `overrides` exists so a harness can sweep models without editing `config.ts`,
 * which is what the tier comments describe as the workflow for settling a model
 * choice — a source edit is a poor way to run an experiment, and it cannot be
 * done twice in one command.
 *
 * Pricing is deliberately not overridable. Only the Durable Object prices a
 * generation, and it never overrides; the harnesses report tokens, which are
 * measured rather than declared and stay correct whatever model produced them.
 */
export function createModelRouter(
  env: Bindings,
  overrides?: ModelOverrides
): (call: GenerateCall) => Promise<GenerateResult> {
  return async (call: GenerateCall) => {
    const tierName = call.tier ?? "synthesis";
    const { provider, model } = resolveTier(tierName, overrides);

    const response = await callAgentLLM(env, {
      provider,
      model,
      maxTokens: GENERATOR_MAX_TOKENS[tierName],
      instructions: call.system,
      messages: call.messages,
      tools: [],
      // The brief turn supplies its own; everything else is composing a graph.
      schema:
        call.schema ?? (DRAFT_SCHEMA as unknown as Record<string, unknown>),
    });

    return {
      content: response.content ?? "",
      inputTokens: response.inputTokens ?? 0,
      outputTokens: response.outputTokens ?? 0,
    };
  };
}
