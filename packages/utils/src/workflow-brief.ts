import type {
  Brief,
  BriefAnswers,
  BriefBlank,
  BriefChoiceOption,
  BriefDestination,
  BriefResourceFamily,
  WorkflowTrigger,
} from "@dafthunk/types";

import { RESOURCE_FAMILY_NOUNS } from "./component-families";

/**
 * Turning a brief into words.
 *
 * Both ends need this and they must never disagree. The app renders the
 * sentence a person reads and edits; the API renders the sentence synthesis is
 * driven from. If those two drifted, the user would confirm one thing and get
 * another — so there is one implementation, in the package both can import.
 */

/**
 * What a blank currently reads as: the answer if there is one, else our guess.
 *
 * For a choice blank both the answer and the assumption are option *ids*, and
 * the label is looked up — which is what lets `resolveDestination` and the
 * sentence agree about what was chosen without storing the same thing twice.
 */
/**
 * Whether a blank is put to the person as a question, as opposed to kept
 * quietly tappable. Absent means asked — the contract that lets briefs stored
 * before the field existed keep their old behavior. One definition, both ends.
 */
export function isAskedBlank(blank: BriefBlank): boolean {
  return blank.asked !== false;
}

/** The option a choice blank currently resolves to: answer over assumption. */
function effectiveOption(
  blank: BriefBlank,
  answers: BriefAnswers
): BriefChoiceOption | undefined {
  if (blank.type !== "choice") return undefined;
  const chosen = answers[blank.id] ?? blank.assumed;
  return blank.options.find((option) => option.id === chosen);
}

/**
 * The trigger in force: a trigger blank's resolved option wins over the
 * brief's top-level field, when that option says which kind it implies.
 *
 * Without this, answering a trigger blank changed the sentence and nothing
 * else — synthesis read `brief.trigger` and built the other workflow anyway.
 */
export function resolveTrigger(
  brief: Brief,
  answers: BriefAnswers = {}
): WorkflowTrigger {
  const blank = brief.blanks.find((entry) => entry.role === "trigger");
  if (!blank) return brief.trigger;
  return effectiveOption(blank, answers)?.triggerValue ?? brief.trigger;
}

export interface ResolvedResourceBinding {
  blankId: string;
  family: BriefResourceFamily;
  binding:
    | { kind: "existing"; resourceId: string; name: string }
    | { kind: "create"; name: string };
}

/**
 * What the grounded blanks resolved to: which real instances to reuse, which
 * to create. The ids never reach the model — they are handed out-of-band to
 * hydration, mirroring how org resources are bound today.
 */
export function resolveResourceBindings(
  brief: Brief,
  answers: BriefAnswers = {}
): ResolvedResourceBinding[] {
  const bindings: ResolvedResourceBinding[] = [];

  for (const blank of brief.blanks) {
    if (!blank.grounding) continue;
    const option = effectiveOption(blank, answers);
    if (!option) continue;

    if (option.createNew) {
      bindings.push({
        blankId: blank.id,
        family: blank.grounding.family,
        binding: { kind: "create", name: option.label },
      });
    } else if (option.resourceId) {
      bindings.push({
        blankId: blank.id,
        family: blank.grounding.family,
        binding: {
          kind: "existing",
          resourceId: option.resourceId,
          name: option.label,
        },
      });
    }
  }

  return bindings;
}

export function resolveBlank(blank: BriefBlank, answers: BriefAnswers): string {
  const answer = answers[blank.id];

  if (blank.type === "choice") {
    const label = (id: string | undefined) =>
      blank.options.find((option) => option.id === id)?.label;
    // An unrecognized answer falls back to the assumption rather than to raw
    // text: an id is never something we should print at a person.
    return label(answer) ?? label(blank.assumed) ?? blank.assumed;
  }

  // An open blank the user emptied falls back to the assumption rather than
  // leaving a hole — the sentence has to stay grammatical at all times.
  return answer?.trim() ? answer.trim() : blank.assumed;
}

/**
 * Joins the segments into one sentence.
 *
 * Punctuation lives in the text segments, and the model is told to emit
 * segments whose plain concatenation already reads correctly. This pass exists
 * because it usually does not: a slot followed by " ." or a double space is the
 * normal case, not the exception. Cheaper and far more robust than asking the
 * model to get spacing right.
 */
export function renderBriefSentence(
  brief: Brief,
  answers: BriefAnswers = {}
): string {
  const byId = new Map(brief.blanks.map((blank) => [blank.id, blank]));

  const joined = brief.segments
    .map((segment) => {
      if (segment.kind === "text") return segment.text;
      const blank = byId.get(segment.blankId);
      // A slot with no blank behind it is a model error. Rendering an ellipsis
      // keeps the sentence readable; rendering nothing would silently drop a
      // clause the user believes is there.
      return blank ? resolveBlank(blank, answers) : "…";
    })
    .join("");

  return joined
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/** The destination in force: a destination blank's answer wins over the assumption. */
export function resolveDestination(
  brief: Brief,
  answers: BriefAnswers = {}
): BriefDestination {
  const blank = brief.blanks.find((entry) => entry.role === "destination");
  const chosen = blank
    ? (answers[blank.id] ?? blank.assumed)
    : brief.destinationId;

  return (
    brief.destinationOptions.find((option) => option.id === chosen) ??
    brief.destinationOptions.find(
      (option) => option.id === brief.destinationId
    ) ??
    brief.destinationOptions[brief.destinationOptions.length - 1]
  );
}

/**
 * The guesses the user never confirmed.
 *
 * Shown under the result, because an assumption the user did not see is
 * indistinguishable from a mistake. Every one is a way the result might be
 * wrong, stated in advance and in their language.
 */
export function unansweredAssumptions(
  brief: Brief,
  answers: BriefAnswers = {}
): Array<{ blankId: string; question: string; assumed: string }> {
  return brief.blanks
    .filter((blank) => !answers[blank.id]?.trim())
    .map((blank) => ({
      blankId: blank.id,
      question: blank.question,
      // The label, never the option id — this string is read by a person and
      // repeated back to the model.
      assumed: resolveBlank(blank, {}),
    }));
}

/**
 * The resolved brief, as the instruction synthesis actually receives.
 *
 * The destination's node types are named outright. That is implementation
 * detail leaking into a human-facing object, and it earns its place twice: it
 * guarantees the delivery node survives the keyword cut that picks the sixty
 * candidate types, and it keeps one source of truth with the validation check
 * that will later insist the graph used one of them.
 */
export function buildSynthesisPrompt(
  brief: Brief,
  answers: BriefAnswers = {},
  /**
   * Bindings to state in the prompt, when the caller has re-validated them
   * against what the org owns right now (and so carries authoritative instance
   * names). Falls back to what the brief itself resolves to. Names only — the
   * model is never shown a resource id.
   */
  resourceBindings?: ResolvedResourceBinding[]
): string {
  const destination = resolveDestination(brief, answers);
  const assumptions = unansweredAssumptions(brief, answers);
  const bindings = resourceBindings ?? resolveResourceBindings(brief, answers);

  const parts = [
    renderBriefSentence(brief, answers),
    "",
    `Trigger: ${resolveTrigger(brief, answers)}`,
    `Deliver the result by: ${destination.label}. Use one of these node types to do it: ${destination.nodeTypes.join(", ")}.`,
  ];

  if (bindings.length) {
    parts.push(
      "",
      "Resources:",
      ...bindings.map((entry) => {
        const noun = RESOURCE_FAMILY_NOUNS[entry.family];
        return entry.binding.kind === "existing"
          ? `- Use the ${noun} named "${entry.binding.name}".`
          : `- A new ${noun} should be created for this; the workspace does not have a suitable one yet.`;
      })
    );
  }

  if (assumptions.length) {
    parts.push(
      "",
      "Assumed, because the request did not say:",
      ...assumptions.map((entry) => `- ${entry.question} → ${entry.assumed}`)
    );
  }

  return parts.join("\n");
}
