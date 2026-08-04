import type { WorkflowTrigger } from "./workflow";

/**
 * The brief: a request read back to the person who made it, with the parts we
 * had to guess left visible and changeable.
 *
 * People describe the interesting half of a job and omit the obvious half —
 * "triage my support email" never says what to do with the triage, because to
 * the person asking that part goes without saying. Asking them to enumerate
 * what they left out does not work; nobody can. Showing them a sentence with
 * the gaps filled in does, because anyone can correct a wrong sentence.
 *
 * So the sentence is the interface. It is their words, with our assumptions
 * rendered inline and tappable, and it is also literally what synthesis is
 * driven from — there is no second, hidden specification.
 */

export type BriefDestinationKind =
  | "display" // an output-* widget in the run result
  | "respond" // the caller of an endpoint, or a form submitter
  | "email" // the account's own address, via send-email
  | "integration"; // an OAuth publishing node

export interface BriefDestination {
  /** Stable, and also the option id when the destination is a blank. */
  id: string;
  kind: BriefDestinationKind;
  /** Set when `kind` is "integration". An `IntegrationProvider`. */
  provider?: string;
  /** Reads inside the sentence: "email it to you", "post it to Discord". */
  label: string;
  /**
   * Node types that realize this, narrowed to what the org can execute.
   * Never empty — an unreachable destination is never constructed.
   */
  nodeTypes: string[];
  /**
   * Offerable, but the account is not connected yet.
   *
   * Only set when linking is *sufficient* — the deployment has credentials for
   * the provider and the node exists. Somewhere linking would not actually
   * unlock is never offered at all, because a destination the run cannot reach
   * is a promise, and this flow does not make promises it cannot keep. The
   * connection is asked for in context, at the step that needs it, rather than
   * as a gate before anyone knows why it matters.
   */
  requiresConnection?: boolean;
}

/**
 * The sentence, in render order.
 *
 * An ordered array rather than a template string with markers: a string needs a
 * parser on both ends and breaks the moment the model emits a marker that does
 * not match a blank. An array renders directly and serializes directly.
 */
export type BriefSegment =
  | { kind: "text"; text: string }
  | { kind: "slot"; blankId: string };

interface BriefBlankBase {
  id: string;
  /** One short question, shown only when the blank is opened. "Which one?" */
  question: string;
  /** One clause of justification, shown under the options. */
  why?: string;
  /**
   * What we would build if the user never answered, and what "Just try it"
   * uses. Never empty — a blank with no assumption would make the sentence
   * ungrammatical and the skip button a lie.
   *
   * For a `choice` blank this is an option **id**, not its label; the label is
   * looked up for display. For an `open` blank it is the text itself.
   */
  assumed: string;
  /** 0..1. How differently the workflow would be built if this were wrong. */
  weight: number;
  /** `destination` and `trigger` rewrite the brief, not merely the sentence. */
  role: "destination" | "trigger" | "subject" | "criterion" | "detail";
}

export interface BriefChoiceOption {
  /** For a destination blank, a `BriefDestination.id`. */
  id: string;
  /** Reads inside the sentence: "to Discord", "every morning". */
  label: string;
  hint?: string;
}

export interface BriefChoiceBlank extends BriefBlankBase {
  type: "choice";
  options: BriefChoiceOption[];
}

export interface BriefOpenBlank extends BriefBlankBase {
  type: "open";
  /** Prefilled into the input. Never a bare placeholder — we propose, we do
   * not ask the user to supply a word we could have guessed. */
  prefill: string;
  maxLength?: number;
}

export type BriefBlank = BriefChoiceBlank | BriefOpenBlank;

export interface Brief {
  /** Bumped when the shape changes, so an older client can degrade. */
  version: 1;
  /** The user's sentence, verbatim. */
  request: string;
  /** Short imperative title: "Triage support email". */
  title: string;
  /** Every `slot` id here has a matching entry in `blanks`. */
  segments: BriefSegment[];
  /** At most `MAX_ASKED_BLANKS`, ordered by descending weight. */
  blanks: BriefBlank[];
  /** Every destination this org can actually build, server-computed. */
  destinationOptions: BriefDestination[];
  /** The assumed one. A destination blank's answer overrides it. */
  destinationId: string;
  trigger: WorkflowTrigger;
}

/** blankId → chosen option id (choice) or free text (open). */
export type BriefAnswers = Record<string, string>;
