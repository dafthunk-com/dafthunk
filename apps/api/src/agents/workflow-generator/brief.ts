import type {
  Brief,
  BriefBlank,
  BriefChoiceOption,
  BriefDestination,
  BriefSegment,
  WorkflowTrigger,
} from "@dafthunk/types";
import { TRIGGER_TO_NODE_TYPES } from "@dafthunk/utils";

import { BENCHMARK_CASES } from "./benchmark-cases";
import {
  BRIEF_SCHEMA,
  buildBriefSystemPrompt,
  buildBriefUserPrompt,
} from "./brief-prompts";
import {
  BRIEF_SUGGESTION_COUNT,
  MAX_ASKED_BLANKS,
  MIN_REQUEST_WORDS,
} from "./config";
import { normalizeTrigger } from "./hydrate";
import { parseJsonObject } from "./parse-json";
import type { GenerateCall, GenerateResult } from "./pipeline";
import { selectExamples } from "./template-examples";

/**
 * Reads a request back as a sentence with the guesses left visible.
 *
 * Deliberately not shaped like `runGenerationPipeline`: it takes no `emit` and
 * returns instead. There is one model call and nothing worth streaming, so the
 * caller owns the frames and this stays a function you can call from a test.
 *
 * Nothing the model says is trusted structurally. `normalizeBrief` is what
 * actually enforces the blank budget, the non-empty assumption and the
 * destination whitelist — a prompt is a request, not a guarantee.
 */

export interface BriefDependencies {
  request: string;
  destinations: BriefDestination[];
  connectedProviders: ReadonlySet<string>;
  callLLM: (call: GenerateCall) => Promise<GenerateResult>;
}

export type BriefOutcome =
  | { kind: "brief"; brief: Brief; usage: BriefUsage }
  | { kind: "suggestions"; prompts: string[]; usage: BriefUsage };

interface BriefUsage {
  inputTokens: number;
  outputTokens: number;
}

const NO_USAGE: BriefUsage = { inputTokens: 0, outputTokens: 0 };

/** Complete requests near the user's, for when theirs is too thin to use. */
export function briefSuggestions(request: string): string[] {
  const byTemplate = new Map(
    BENCHMARK_CASES.map((entry) => [entry.templateId, entry.prompt])
  );

  const matched = selectExamples(request, BRIEF_SUGGESTION_COUNT)
    .map((template) => byTemplate.get(template.id))
    .filter((prompt): prompt is string => Boolean(prompt));

  // `selectExamples` can return fewer than asked when nothing scores, and a
  // screen offering one option is not a choice.
  for (const entry of BENCHMARK_CASES) {
    if (matched.length >= BRIEF_SUGGESTION_COUNT) break;
    if (!matched.includes(entry.prompt)) matched.push(entry.prompt);
  }

  return matched.slice(0, BRIEF_SUGGESTION_COUNT);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface RawBlank {
  id?: unknown;
  type?: unknown;
  question?: unknown;
  why?: unknown;
  assumed?: unknown;
  prefill?: unknown;
  weight?: unknown;
  role?: unknown;
  options?: unknown;
}

function toOptions(value: unknown): BriefChoiceOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (option): option is { id: string; label: string; hint?: string } =>
        Boolean(option) &&
        typeof option === "object" &&
        typeof (option as { id?: unknown }).id === "string" &&
        typeof (option as { label?: unknown }).label === "string"
    )
    .map((option) => ({
      id: option.id,
      label: option.label,
      ...(typeof option.hint === "string" ? { hint: option.hint } : {}),
    }));
}

/**
 * One raw blank, or nothing if it could never be rendered.
 *
 * A blank with no assumption is dropped rather than repaired: the assumption is
 * what makes the sentence readable and "Just try it" honest, and inventing one
 * here would be guessing at a guess.
 */
function toBlank(raw: RawBlank): BriefBlank | undefined {
  const id = typeof raw.id === "string" ? raw.id : undefined;
  const assumed = typeof raw.assumed === "string" ? raw.assumed.trim() : "";
  if (!id || !assumed) return undefined;

  const base = {
    id,
    question: typeof raw.question === "string" ? raw.question : "Which one?",
    ...(typeof raw.why === "string" ? { why: raw.why } : {}),
    assumed,
    weight: typeof raw.weight === "number" ? raw.weight : 0,
    role: (typeof raw.role === "string" &&
    ["destination", "trigger", "subject", "criterion", "detail"].includes(
      raw.role
    )
      ? raw.role
      : "detail") as BriefBlank["role"],
  };

  if (raw.type === "open") {
    return {
      ...base,
      type: "open",
      prefill: typeof raw.prefill === "string" ? raw.prefill : assumed,
    };
  }

  const options = toOptions(raw.options);
  // A choice with fewer than two options is not a choice, and one whose
  // assumption is not among them cannot be resolved.
  if (options.length < 2 || !options.some((option) => option.id === assumed)) {
    return undefined;
  }

  return { ...base, type: "choice", options };
}

function toSegments(value: unknown): BriefSegment[] {
  if (!Array.isArray(value)) return [];
  const segments: BriefSegment[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as { kind?: unknown; text?: unknown; blankId?: unknown };

    if (entry.kind === "slot" && typeof entry.blankId === "string") {
      segments.push({ kind: "slot", blankId: entry.blankId });
    } else if (typeof entry.text === "string") {
      segments.push({ kind: "text", text: entry.text });
    }
  }

  return segments;
}

/**
 * What a blank's assumption reads as in the sentence.
 *
 * A destination blank's options may be dropped before this runs, so the
 * destination list is consulted too — otherwise a collapsed destination slot
 * would print a bare id like "email" at the user.
 */
function assumedLabel(
  blank: BriefBlank,
  destinations: BriefDestination[]
): string {
  if (blank.type === "choice") {
    const option = blank.options.find((entry) => entry.id === blank.assumed);
    if (option) return option.label;
  }
  const destination = destinations.find((entry) => entry.id === blank.assumed);
  return destination?.label ?? blank.assumed;
}

export interface NormalizeBriefContext {
  request: string;
  destinations: BriefDestination[];
}

/**
 * Turns whatever the model returned into a brief that renders.
 *
 * Everything the prompt asks for is re-imposed here, because a prompt is a
 * request. The budget is sliced, dropped blanks collapse into the text they
 * would have read as, an unknown destination falls back to one that exists, and
 * an unresolvable slot becomes an ellipsis rather than a hole.
 */
export function normalizeBrief(
  raw: Record<string, unknown>,
  context: NormalizeBriefContext
): Brief | undefined {
  const segments = toSegments(raw.segments);
  if (segments.length === 0) return undefined;

  const parsed = (Array.isArray(raw.blanks) ? raw.blanks : [])
    .map((entry) => toBlank((entry ?? {}) as RawBlank))
    .filter((blank): blank is BriefBlank => blank !== undefined);

  const known = new Set(
    context.destinations.map((destination) => destination.id)
  );

  // Highest impact first, then the budget. Ties keep the model's order.
  const blanks = [...parsed]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_ASKED_BLANKS)
    // A destination blank offering something this org cannot build would let
    // the user pick a promise we cannot keep — the one thing never allowed.
    .filter(
      (blank) =>
        blank.role !== "destination" ||
        (blank.type === "choice" &&
          blank.options.every((option) => known.has(option.id)))
    );

  const surviving = new Set(blanks.map((blank) => blank.id));
  const byId = new Map(parsed.map((blank) => [blank.id, blank]));

  // A blank that did not survive has not disappeared — it has been decided.
  // Its slot becomes the words its assumption reads as, so the sentence still
  // states what will happen rather than trailing off.
  const finalSegments: BriefSegment[] = segments.map((segment) => {
    if (segment.kind === "text" || surviving.has(segment.blankId)) {
      return segment;
    }
    const decided = byId.get(segment.blankId);
    if (!decided) return { kind: "text", text: "…" };
    return { kind: "text", text: assumedLabel(decided, context.destinations) };
  });

  // The assumption is what "Just try it" builds, so it can never be a
  // destination that would first send the user through an OAuth round trip.
  // The prompt asks for this; this is what makes it true.
  const ready = new Set(
    context.destinations
      .filter((destination) => !destination.requiresConnection)
      .map((destination) => destination.id)
  );
  const fallbackId =
    [...ready].pop() ??
    context.destinations[context.destinations.length - 1]?.id ??
    "display";

  const claimed =
    typeof raw.destinationId === "string" ? raw.destinationId : "";
  const destinationId = ready.has(claimed) ? claimed : fallbackId;

  for (const blank of blanks) {
    if (blank.role !== "destination" || blank.type !== "choice") continue;
    if (ready.has(blank.assumed)) continue;
    // Keep the unlinked option on offer — it is very likely the one they
    // asked for — but assume something that works today.
    const readyOption = blank.options.find((option) => ready.has(option.id));
    if (readyOption) blank.assumed = readyOption.id;
  }

  return {
    version: 1,
    request: context.request,
    title: typeof raw.title === "string" ? raw.title : "New workflow",
    segments: finalSegments,
    blanks,
    destinationOptions: context.destinations,
    destinationId,
    trigger: (normalizeTrigger(String(raw.trigger ?? "manual")) ??
      "manual") as WorkflowTrigger,
  };
}

export async function generateBrief(
  deps: BriefDependencies
): Promise<BriefOutcome> {
  // Cheaper than a model call, and a request this short has nothing in it to
  // read back — offering complete sentences beats interrogating.
  if (wordCount(deps.request) < MIN_REQUEST_WORDS) {
    return {
      kind: "suggestions",
      prompts: briefSuggestions(deps.request),
      usage: NO_USAGE,
    };
  }

  const triggers = Object.keys(TRIGGER_TO_NODE_TYPES) as WorkflowTrigger[];

  let response: GenerateResult;
  try {
    response = await deps.callLLM({
      tier: "fast",
      schema: BRIEF_SCHEMA as unknown as Record<string, unknown>,
      system: buildBriefSystemPrompt({
        destinations: deps.destinations,
        triggers,
        connectedProviders: deps.connectedProviders,
      }),
      messages: [{ role: "user", content: buildBriefUserPrompt(deps.request) }],
    });
  } catch {
    // The brief turn must never end the session. Falling back to suggestions
    // costs the user a click; failing costs them the product.
    return {
      kind: "suggestions",
      prompts: briefSuggestions(deps.request),
      usage: NO_USAGE,
    };
  }

  const usage = {
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };

  let raw: Record<string, unknown>;
  try {
    raw = parseJsonObject(response.content);
  } catch {
    return {
      kind: "suggestions",
      prompts: briefSuggestions(deps.request),
      usage,
    };
  }

  if (raw.insufficient === true) {
    return {
      kind: "suggestions",
      prompts: briefSuggestions(deps.request),
      usage,
    };
  }

  const brief = normalizeBrief(raw, {
    request: deps.request,
    destinations: deps.destinations,
  });

  if (!brief) {
    return {
      kind: "suggestions",
      prompts: briefSuggestions(deps.request),
      usage,
    };
  }

  return { kind: "brief", brief, usage };
}
