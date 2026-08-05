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
  BRIEF_ATTEMPTS,
  BRIEF_SUGGESTION_COUNT,
  MAX_ASKED_BLANKS,
  MIN_REQUEST_WORDS,
} from "./config";
import { normalizeTrigger } from "./hydrate";
import { parseJsonObject } from "./parse-json";
import type { GenerateCall, GenerateResult } from "./pipeline";
import { rankExamples } from "./template-examples";

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
  /**
   * The request genuinely had too little in it to read back. `matched` says
   * whether the prompts relate to what they asked for, so the screen can stop
   * claiming comprehension it does not have.
   */
  | {
      kind: "suggestions";
      prompts: string[];
      matched: boolean;
      usage: BriefUsage;
    }
  /**
   * Our end broke. Kept apart from `suggestions` because the two need opposite
   * words: one asks the user to say more, the other must not imply they did
   * anything wrong.
   */
  | { kind: "failed"; message: string; usage: BriefUsage };

interface BriefUsage {
  inputTokens: number;
  outputTokens: number;
}

const NO_USAGE: BriefUsage = { inputTokens: 0, outputTokens: 0 };

/**
 * Complete requests near the user's, for when theirs is too thin to use.
 *
 * `matched` is the honest part. When nothing scores against the request this
 * still pads from the catalogue — a screen offering one option is not a choice
 * — but padding is not comprehension, and a caller that presents unrelated
 * examples under "did you mean" teaches the user the product cannot read.
 */
export function briefSuggestions(request: string): {
  prompts: string[];
  matched: boolean;
} {
  const byTemplate = new Map(
    BENCHMARK_CASES.map((entry) => [entry.templateId, entry.prompt])
  );

  const scored = rankExamples(request, BRIEF_SUGGESTION_COUNT)
    .map((template) => byTemplate.get(template.id))
    .filter((prompt): prompt is string => Boolean(prompt));

  const prompts = [...scored];
  for (const entry of BENCHMARK_CASES) {
    if (prompts.length >= BRIEF_SUGGESTION_COUNT) break;
    if (!prompts.includes(entry.prompt)) prompts.push(entry.prompt);
  }

  return {
    prompts: prompts.slice(0, BRIEF_SUGGESTION_COUNT),
    matched: scored.length > 0,
  };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** A one-word description of what a value actually is, for failure logs. */
function describeShape(value: unknown): string {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value === null) return "null";
  if (typeof value === "string") return `string(${value.length})`;
  return typeof value;
}

/**
 * Reduces a two-part question to the part the single answer box can hold.
 *
 * "What starts this, and which blog post?" gets one text field, so whichever
 * half the person answers the other is silently lost. The prompt asks for one
 * question; this is what makes it true. Deliberately narrow — only a comma
 * before "and", which is unambiguous — because a question containing a plain
 * "and" is usually still one question.
 */
function singleQuestion(question: string): string {
  const match = question.match(/^(.*?),\s+and\s+.+\?$/s);
  if (!match) return question;
  return `${match[1].replace(/[\s,;:]+$/, "")}?`;
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
    question:
      typeof raw.question === "string"
        ? singleQuestion(raw.question)
        : "Which one?",
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

  /**
   * Where the result goes is never quietly reassigned.
   *
   * This used to prefer whatever was already connected, so that "post it to
   * Slack" — Slack not being offerable at all — became "post it to X" purely
   * because X happened to be the one linked account. The user is then one
   * click from broadcasting to a public network they never named, and the
   * apology above it does not even say which one it picked.
   *
   * Asking someone to link the account they asked for is a smaller
   * imposition than sending their content somewhere else. So an unconnected
   * destination is kept and the screen asks them to connect it; the only
   * fallback is `display`, which delivers nowhere and therefore substitutes
   * nothing.
   */
  const neutralId =
    context.destinations.find((destination) => destination.kind === "display")
      ?.id ??
    context.destinations[context.destinations.length - 1]?.id ??
    "display";

  const claimed =
    typeof raw.destinationId === "string" ? raw.destinationId : "";
  const destinationId = known.has(claimed) ? claimed : neutralId;

  // A destination blank keeps whatever the model assumed, connected or not.
  // `resolveDestination` carries `requiresConnection` through to the page,
  // which shows the connect card and holds the build button until it is done.

  // Only trust it if it really is absent from what we offered — the model
  // naming an available destination here would produce an apology for a
  // substitution that never happened.
  const claimedUnavailable =
    typeof raw.unavailableDestination === "string"
      ? raw.unavailableDestination.trim()
      : "";
  const unavailableDestination =
    claimedUnavailable &&
    !context.destinations.some((destination) =>
      destination.label.toLowerCase().includes(claimedUnavailable.toLowerCase())
    )
      ? claimedUnavailable
      : undefined;

  return {
    version: 1,
    request: context.request,
    title: typeof raw.title === "string" ? raw.title : "New workflow",
    segments: finalSegments,
    blanks,
    destinationOptions: context.destinations,
    destinationId,
    ...(unavailableDestination ? { unavailableDestination } : {}),
    trigger: (normalizeTrigger(String(raw.trigger ?? "manual")) ??
      "manual") as WorkflowTrigger,
  };
}

/** What one model call produced, before deciding whether to try again. */
type BriefAttempt =
  | { kind: "brief"; brief: Brief }
  | { kind: "insufficient" }
  /** Our end: the call threw, or the answer could not be read as a brief. */
  | { kind: "unusable"; reason: string };

/**
 * Extra instruction appended when a previous attempt came back off-schema.
 *
 * It has two jobs, and the second is the one that makes the retry work at all.
 * It tells the model what went wrong — but it also changes the request body,
 * and the calls go through a caching gateway. A byte-identical retry is served
 * the byte-identical failure from cache, which is exactly what the first
 * version of this retry did: two attempts, same corrupt answer, same length.
 */
const RETRY_NUDGE =
  '\n\nYour previous answer could not be read: `segments` must be a JSON array of objects, each with a `kind` of either "text" or "slot". Do not wrap it in a string or split it across other keys. Return the whole object through the tool.';

async function attemptBrief(
  deps: BriefDependencies,
  triggers: WorkflowTrigger[],
  attemptNumber: number
): Promise<{ attempt: BriefAttempt; usage: BriefUsage }> {
  const userPrompt =
    attemptNumber === 0
      ? buildBriefUserPrompt(deps.request)
      : buildBriefUserPrompt(deps.request) + RETRY_NUDGE;

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
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { attempt: { kind: "unusable", reason }, usage: NO_USAGE };
  }

  const usage = {
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };

  let raw: Record<string, unknown>;
  try {
    raw = parseJsonObject(response.content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { attempt: { kind: "unusable", reason }, usage };
  }

  // The one answer that is about the request rather than about us.
  if (raw.insufficient === true) {
    return { attempt: { kind: "insufficient" }, usage };
  }

  const brief = normalizeBrief(raw, {
    request: deps.request,
    destinations: deps.destinations,
  });

  if (!brief) {
    return {
      attempt: {
        kind: "unusable",
        // The shape, not just the verdict. When the forced tool returns
        // something off-schema the only way to tell what happened is to see
        // what arrived, and "did not render" sends whoever reads the log
        // looking at the prompt instead of at the decoding.
        reason: `the model's answer did not describe a sentence we could render (segments=${describeShape(
          raw.segments
        )}, keys=${Object.keys(raw).join(",")})`,
      },
      usage,
    };
  }

  return { attempt: { kind: "brief", brief }, usage };
}

/**
 * Reads the request back, retrying once if our end produces something unusable.
 *
 * The retry exists because the forced-tool response is not in fact guaranteed
 * to match its schema. It arrives mangled rarely — segments encoded as a string
 * with the array elements spilled into top-level numeric keys — and the old
 * code turned that into "did you mean something like…", which tells a person
 * whose request was perfectly clear that they wrote it badly. Retrying costs
 * one cheap call on the fast tier; the alternative costs their trust.
 *
 * Only `insufficient` — the model's own judgement about the request — still
 * reaches the suggestions screen.
 */
export async function generateBrief(
  deps: BriefDependencies
): Promise<BriefOutcome> {
  // Cheaper than a model call, and a request this short has nothing in it to
  // read back — offering complete sentences beats interrogating.
  if (wordCount(deps.request) < MIN_REQUEST_WORDS) {
    return {
      kind: "suggestions",
      ...briefSuggestions(deps.request),
      usage: NO_USAGE,
    };
  }

  const triggers = Object.keys(TRIGGER_TO_NODE_TYPES) as WorkflowTrigger[];

  let inputTokens = 0;
  let outputTokens = 0;
  let lastReason = "";

  for (let attemptNumber = 0; attemptNumber < BRIEF_ATTEMPTS; attemptNumber++) {
    const { attempt, usage } = await attemptBrief(
      deps,
      triggers,
      attemptNumber
    );
    inputTokens += usage.inputTokens;
    outputTokens += usage.outputTokens;
    const spent = { inputTokens, outputTokens };

    if (attempt.kind === "brief") {
      return { kind: "brief", brief: attempt.brief, usage: spent };
    }
    if (attempt.kind === "insufficient") {
      return {
        kind: "suggestions",
        ...briefSuggestions(deps.request),
        usage: spent,
      };
    }

    lastReason = attempt.reason;
    console.warn(
      `[WorkflowGenerator] brief attempt ${attemptNumber + 1}/${BRIEF_ATTEMPTS} unusable: ${lastReason}`
    );
  }

  return {
    kind: "failed",
    message: lastReason,
    usage: { inputTokens, outputTokens },
  };
}
