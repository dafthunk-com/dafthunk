import type {
  Brief,
  BriefBlank,
  BriefChoiceOption,
  BriefDestination,
  BriefResourceFamily,
  BriefSegment,
  WorkflowTrigger,
} from "@dafthunk/types";
import { BRIEF_BLANK_ROLES } from "@dafthunk/types";
import {
  BRIEF_EXAMPLES,
  RESOURCE_FAMILY_NOUNS,
  TRIGGER_TO_NODE_TYPES,
} from "@dafthunk/utils";

import { rankBriefExamples } from "./brief-examples";
import {
  BRIEF_ATTEMPTS,
  BRIEF_SUGGESTION_COUNT,
  MAX_ASKED_BLANKS,
  MAX_TOTAL_BLANKS,
  MIN_REQUEST_WORDS,
} from "./config";
import { defaultDestination } from "./destinations";
import type { GroundingContext } from "./grounding";
import type { GenerateCall, GenerateResult } from "./llm";
import { parseJsonObject } from "./parse-json";
import { briefBriefing } from "./projection";
import { buildBriefUserPrompt } from "./projection/brief-turn";
import { normalizeTrigger, VALID_TRIGGERS } from "./triggers";
import type { Workspace } from "./workspace";

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
  /**
   * What can be built here. The sentence may only offer destinations this
   * workspace can actually reach and name components it actually owns — the
   * same picture the pipeline is held to, so a brief cannot promise something
   * the build would then have to walk back.
   *
   * The trigger is not known until the brief picks one, so destinations are
   * asked for as `manual`; responder destinations are resolved later, on
   * `resolve`, once there is a trigger to resolve them against.
   */
  workspace: Workspace;
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
  const scored = rankBriefExamples(request, BRIEF_SUGGESTION_COUNT);

  const prompts = [...scored];
  for (const example of BRIEF_EXAMPLES) {
    if (prompts.length >= BRIEF_SUGGESTION_COUNT) break;
    if (!prompts.includes(example.prompt)) prompts.push(example.prompt);
  }

  return {
    prompts: prompts.slice(0, BRIEF_SUGGESTION_COUNT),
    matched: scored.length > 0,
  };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * What a person would have typed if they meant this provider.
 *
 * Provider ids are wire values, and matching on them directly is wrong in both
 * directions: nobody writes "google-mail", and splitting it yields "mail",
 * which matches every request containing the word email.
 */
const PROVIDER_ALIASES: Record<string, string[]> = {
  "google-mail": ["gmail", "google mail"],
  "google-calendar": ["google calendar", "gcal"],
  discord: ["discord"],
  instagram: ["instagram", "insta", "ig reel", "ig post"],
  x: ["x", "twitter", "tweet"],
  linkedin: ["linkedin"],
  reddit: ["reddit"],
  wordpress: ["wordpress"],
  github: ["github"],
};

/**
 * Whether the request actually asked for this provider by name.
 *
 * The question that decides whether an OAuth round trip is justified. Someone
 * who wrote "post it to Discord" has already accepted that Discord is
 * involved; someone who wrote "email it to me" has not asked for Gmail, and
 * putting a Connect Google Mail button in front of them is answering a
 * question they did not ask — with their own words still on screen saying
 * something simpler.
 *
 * Word boundaries, so "x" matches "post it to X" but not "text".
 */
function requestNamesProvider(provider: string, request: string): boolean {
  const aliases = PROVIDER_ALIASES[provider] ?? [provider];
  const text = request.toLowerCase();
  return aliases.some((alias) =>
    new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
      text
    )
  );
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
  grounding?: unknown;
  options?: unknown;
}

const RESOURCE_FAMILIES = new Set<string>(Object.keys(RESOURCE_FAMILY_NOUNS));

function toGrounding(
  value: unknown
): { family: BriefResourceFamily } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const family = (value as { family?: unknown }).family;
  if (typeof family !== "string" || !RESOURCE_FAMILIES.has(family)) {
    return undefined;
  }
  return { family: family as BriefResourceFamily };
}

/**
 * An option as parsed. `resourceName` is transient: the model names workspace
 * components — ids never enter a prompt — and the server resolves the name to
 * a `resourceId` during normalization, or drops the option.
 */
interface ParsedOption extends BriefChoiceOption {
  resourceName?: string;
}

function toOptions(value: unknown): ParsedOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (
        option
      ): option is {
        id: string;
        label: string;
        hint?: string;
        triggerValue?: unknown;
        resourceName?: unknown;
        createNew?: unknown;
      } =>
        Boolean(option) &&
        typeof option === "object" &&
        typeof (option as { id?: unknown }).id === "string" &&
        typeof (option as { label?: unknown }).label === "string"
    )
    .map((option) => ({
      id: option.id,
      label: option.label,
      ...(typeof option.hint === "string" ? { hint: option.hint } : {}),
      // Kept only when they survive their role-specific validation later:
      // a triggerValue naming no real trigger and a resourceName naming no
      // real component are both promises the run cannot keep.
      ...(typeof option.triggerValue === "string"
        ? { triggerValue: option.triggerValue as WorkflowTrigger }
        : {}),
      ...(typeof option.resourceName === "string"
        ? { resourceName: option.resourceName }
        : {}),
      ...(option.createNew === true ? { createNew: true } : {}),
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

  const grounding = toGrounding(raw.grounding);

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
    (BRIEF_BLANK_ROLES as readonly string[]).includes(raw.role)
      ? raw.role
      : "detail") as BriefBlank["role"],
    // Options-based mechanics only, so an open blank cannot carry it.
    ...(grounding && raw.type !== "open" ? { grounding } : {}),
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
  /** What the org owns right now; grounded options are validated against it. */
  grounding?: GroundingContext;
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

  /**
   * A `triggerValue` naming no real trigger is stripped, not trusted: the
   * option stays — its phrasing may still be right — but it can no longer
   * change how the workflow starts. Off a trigger blank the field means
   * nothing, so it is stripped there too.
   */
  for (const blank of parsed) {
    if (blank.type !== "choice") continue;
    blank.options = blank.options.map((option) => {
      if (option.triggerValue === undefined) return option;
      if (blank.role === "trigger" && VALID_TRIGGERS.has(option.triggerValue)) {
        return option;
      }
      const stripped = { ...option };
      delete stripped.triggerValue;
      return stripped;
    });
  }

  /**
   * Grounded options are promises about the workspace, and they live under
   * the destination rule: never offer what we cannot bind. The model names
   * components — ids never enter a prompt — so names are resolved to ids
   * here, and an option naming nothing real is dropped. A create option on a
   * family that cannot be created is dropped the same way.
   */
  const byFamily = new Map(
    (context.grounding?.families ?? []).map((family) => [family.family, family])
  );
  for (const blank of parsed) {
    if (!blank.grounding || blank.type !== "choice") continue;
    const family = byFamily.get(blank.grounding.family);
    if (!family) {
      // Grounding claimed against nothing we know — the blank survives as a
      // plain choice, but it can no longer bind anything.
      delete blank.grounding;
      continue;
    }

    blank.options = (blank.options as ParsedOption[]).flatMap((option) => {
      const { resourceName, ...kept } = option;
      if (kept.createNew) {
        return family.creatable ? [kept] : [];
      }
      const wanted = resourceName ?? kept.resourceId;
      if (wanted === undefined) return [kept];
      const needle = wanted.trim().toLowerCase();
      const instance =
        family.instances.find((entry) => entry.id === wanted) ??
        family.instances.find(
          (entry) => entry.name.trim().toLowerCase() === needle
        );
      if (!instance) return [];
      return [{ ...kept, resourceId: instance.id }];
    });

    // The assumption must stay an offered option: follow it to a surviving
    // one, existing instances before creation — assuming "create" would
    // build a duplicate of something the org already has.
    if (!blank.options.some((option) => option.id === blank.assumed)) {
      const fallback =
        blank.options.find((option) => option.resourceId) ?? blank.options[0];
      if (fallback) blank.assumed = fallback.id;
    }
  }

  const known = new Set(
    context.destinations.map((destination) => destination.id)
  );

  /**
   * A destination blank offering something this org cannot build would let the
   * user pick a promise we cannot keep — the one thing never allowed.
   */
  const offerable = (blank: BriefBlank) =>
    blank.role !== "destination" ||
    (blank.type === "choice" &&
      blank.options.every((option) => known.has(option.id)));

  /**
   * The destination slot is kept outside the budget.
   *
   * The budget limits *questions*, and this is not one: it arrives pre-filled
   * with an assumption the user can ignore, and "Just try it" is still a single
   * click. Letting it compete meant the one field that decides whether the
   * whole workflow is useful could be evicted by a heavier-weighted question
   * about a schedule, collapsing into plain text that reads like a decision
   * already made — which is how "email it to me" ended up meaning Gmail with
   * nothing on screen to say so.
   */
  /**
   * A grounded blank may have lost options to validation. What is left has to
   * still be a choice whose assumption is on offer; otherwise the blank is
   * decided, and collapses into the words its assumption reads as.
   */
  const viable = (blank: BriefBlank) =>
    blank.type !== "choice" ||
    (blank.options.length >= 2 &&
      blank.options.some((option) => option.id === blank.assumed));

  const ranked = [...parsed].sort((a, b) => b.weight - a.weight);
  const eligible = ranked.filter((blank) => offerable(blank) && viable(blank));
  const destinationBlank = eligible.find(
    (blank) => blank.role === "destination"
  );
  const rest = eligible.filter((blank) => blank !== destinationBlank);

  /**
   * Eviction demotes; it no longer destroys.
   *
   * The top `MAX_ASKED_BLANKS` are put as questions. The ones beyond used to
   * collapse into plain text, which threw away moving parts the model had
   * correctly identified — the schedule hour was tappable on one run and inert
   * prose on the next, for no reason the user could see. Now they stay in the
   * sentence as quiet slots: styled like an answered guess, still tappable,
   * asking for nothing.
   *
   * `MAX_TOTAL_BLANKS` bounds the confetti. A trigger blank is exempt — like
   * the destination, it is a guaranteed slot, never collapsed by rank.
   */
  const asked = rest.slice(0, MAX_ASKED_BLANKS);
  const overflow = rest.slice(MAX_ASKED_BLANKS);

  let quietCapacity = Math.max(
    0,
    MAX_TOTAL_BLANKS - (destinationBlank ? 1 : 0) - asked.length
  );
  const quiet: BriefBlank[] = [];
  for (const blank of overflow) {
    if (blank.role === "trigger") {
      quiet.push(blank);
    } else if (quietCapacity > 0) {
      quiet.push(blank);
      quietCapacity--;
    }
  }

  const blanks: BriefBlank[] = [
    ...(destinationBlank ? [{ ...destinationBlank, asked: true }] : []),
    ...asked.map((blank) => ({ ...blank, asked: true })),
    ...quiet.map((blank) => ({ ...blank, asked: false })),
  ];

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
  const byDestinationId = new Map(
    context.destinations.map((destination) => [destination.id, destination])
  );

  /**
   * Whether this may stand as the assumption — the thing "Just try it" builds.
   *
   * An unlinked destination qualifies only when the request named it. Someone
   * who wrote "post it to Discord" has already accepted that Discord is
   * involved, and sending them to link it beats sending their post elsewhere.
   * Someone who wrote "email it to me" has asked for no such thing, and the
   * model choosing Gmail on their behalf put a Connect button and a dead Build
   * button in front of a request that a plain email would have satisfied.
   */
  const assumable = (id: string): boolean => {
    const destination = byDestinationId.get(id);
    if (!destination) return false;
    if (!destination.requiresConnection) return true;
    return destination.provider
      ? requestNamesProvider(destination.provider, context.request)
      : false;
  };

  // Responder, then email, then the last thing that needs no account — which
  // is `display`, delivering nowhere and so substituting nothing.
  const fallback = defaultDestination(context.destinations);

  const claimed =
    typeof raw.destinationId === "string" ? raw.destinationId : "";
  const destinationId = assumable(claimed) ? claimed : fallback.id;

  /**
   * The same rule inside the sentence.
   *
   * The unlinked option stays on offer — it is very likely the one they want,
   * and picking it shows the connect card. Only the *assumption* moves, and it
   * moves to something that needs no account rather than to whichever account
   * happens to be linked: that is the difference between offering a choice and
   * quietly broadcasting somewhere nobody asked for.
   */
  for (const blank of blanks) {
    if (blank.role !== "destination" || blank.type !== "choice") continue;
    if (assumable(blank.assumed)) continue;

    const safeOption = blank.options.find((option) => assumable(option.id));
    if (safeOption) {
      blank.assumed = safeOption.id;
      continue;
    }

    // Nothing on offer is buildable without an account. Add the fallback so
    // the sentence still states something that works today.
    if (!blank.options.some((option) => option.id === fallback.id)) {
      blank.options = [
        ...blank.options,
        { id: fallback.id, label: fallback.label },
      ];
    }
    blank.assumed = fallback.id;
  }

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
  | { kind: "brief"; brief: Brief; missingRoles: BriefRole[] }
  | { kind: "insufficient" }
  /** Our end: the call threw, or the answer could not be read as a brief. */
  | { kind: "unusable"; reason: string };

export type BriefRole = BriefBlank["role"];

/**
 * The guaranteed slots a normalized brief still lacks.
 *
 * The trigger is always a slot, and the destination is a slot whenever there
 * is more than one place the result could go. The normalizer cannot repair a
 * miss — a slot that was never emitted has no sentence position to synthesize
 * into — so it is reported here and the caller re-asks.
 */
export function missingBriefRoles(brief: Brief): BriefRole[] {
  const roles = new Set(brief.blanks.map((blank) => blank.role));
  const missing: BriefRole[] = [];
  if (!roles.has("trigger")) missing.push("trigger");
  if (!roles.has("destination") && brief.destinationOptions.length > 1) {
    missing.push("destination");
  }
  return missing;
}

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

/**
 * The same mechanism for a structurally sound brief that left out a slot the
 * sentence is required to carry. Same cache-busting property as `RETRY_NUDGE`.
 */
function roleNudge(roles: BriefRole[]): string {
  return `\n\nYour previous answer left out required moving parts: ${roles.join(
    ", "
  )}. Every brief needs a blank with role "trigger" — what starts it, and when, if scheduled — placed where the sentence describes the start, with "triggerValue" on each option; and a blank with role "destination" when more than one destination is offered. Re-emit the whole brief with those slots in the sentence.`;
}

async function attemptBrief(
  deps: BriefDependencies,
  destinations: BriefDestination[],
  triggers: WorkflowTrigger[],
  nudge: string | undefined
): Promise<{ attempt: BriefAttempt; usage: BriefUsage }> {
  const userPrompt = buildBriefUserPrompt(deps.request) + (nudge ?? "");

  let response: GenerateResult;
  try {
    const briefing = briefBriefing({
      destinations,
      triggers,
      connectedProviders: deps.workspace.connectedProviders,
      grounding: deps.workspace.grounding,
    });

    response = await deps.callLLM({
      tier: "fast",
      schema: briefing.schema,
      system: briefing.system,
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
    destinations,
    grounding: deps.workspace.grounding,
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

  return {
    attempt: { kind: "brief", brief, missingRoles: missingBriefRoles(brief) },
    usage,
  };
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

  // Asked once and reused across retries: a retry re-asks the model, not the
  // workspace, and nothing about what this org can reach changes mid-loop.
  const destinations = deps.workspace.destinations("manual");

  let inputTokens = 0;
  let outputTokens = 0;
  let lastReason = "";
  let nudge: string | undefined;
  // A brief that renders but lacks a guaranteed slot. Worth one more call —
  // and worth keeping in hand, because it is still far better than failing.
  let incomplete: Brief | undefined;

  /**
   * One retry per fault kind, not one budget for both. A mangled answer and a
   * missing slot are unrelated transients, and a run that hits both in
   * sequence — the corruption first, then a structurally sound brief with no
   * trigger blank — used to spend its whole budget on the first and accept
   * the second unrepaired. Worst case is three fast-tier calls.
   */
  let unusableRetries = BRIEF_ATTEMPTS - 1;
  let roleRetries = BRIEF_ATTEMPTS - 1;

  for (;;) {
    const { attempt, usage } = await attemptBrief(
      deps,
      destinations,
      triggers,
      nudge
    );
    inputTokens += usage.inputTokens;
    outputTokens += usage.outputTokens;
    const spent = { inputTokens, outputTokens };

    if (attempt.kind === "brief") {
      if (attempt.missingRoles.length === 0) {
        return { kind: "brief", brief: attempt.brief, usage: spent };
      }
      incomplete = attempt.brief;
      console.warn(
        `[WorkflowGenerator] brief missing roles: ${attempt.missingRoles.join(", ")}`
      );
      if (roleRetries === 0) break;
      roleRetries--;
      nudge = roleNudge(attempt.missingRoles);
      continue;
    }
    if (attempt.kind === "insufficient") {
      return {
        kind: "suggestions",
        ...briefSuggestions(deps.request),
        usage: spent,
      };
    }

    lastReason = attempt.reason;
    console.warn(`[WorkflowGenerator] brief attempt unusable: ${lastReason}`);
    if (unusableRetries === 0) break;
    unusableRetries--;
    nudge = RETRY_NUDGE;
  }

  // Enforcement degrades to best-effort rather than punishing a fine request:
  // a brief without its trigger slot is a defect on our side, not the user's.
  if (incomplete) {
    console.warn(
      `[WorkflowGenerator] accepting a brief without guaranteed slots`
    );
    return {
      kind: "brief",
      brief: incomplete,
      usage: { inputTokens, outputTokens },
    };
  }

  return {
    kind: "failed",
    message: lastReason,
    usage: { inputTokens, outputTokens },
  };
}
