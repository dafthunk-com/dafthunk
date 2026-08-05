import type { BriefDestination, WorkflowTrigger } from "@dafthunk/types";

import { BENCHMARK_CASES } from "./benchmark-cases";
import { MAX_ASKED_BLANKS } from "./config";

/**
 * The brief turn's schema.
 *
 * Kept small on purpose: on the Anthropic path it is stringified into the
 * system prompt on every call, and this turn is the one a person is waiting on.
 */
export const BRIEF_SCHEMA = {
  type: "object",
  required: ["title", "segments", "blanks", "destinationId", "trigger"],
  properties: {
    title: {
      type: "string",
      description: "Short imperative name, e.g. 'Triage support email'",
    },
    insufficient: {
      type: "boolean",
      description:
        "True when the request is too vague to state as one sentence. Emit nothing else.",
    },
    segments: {
      type: "array",
      description:
        "The sentence in order. Concatenating these must already read correctly.",
      items: {
        type: "object",
        required: ["kind"],
        properties: {
          kind: { type: "string", enum: ["text", "slot"] },
          text: { type: "string", description: "Set when kind is 'text'" },
          blankId: { type: "string", description: "Set when kind is 'slot'" },
        },
      },
    },
    blanks: {
      type: "array",
      description: `At most ${MAX_ASKED_BLANKS}, highest weight first.`,
      items: {
        type: "object",
        required: ["id", "type", "question", "assumed", "weight", "role"],
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["choice", "open"] },
          question: {
            type: "string",
            description:
              "One question, four words or so. 'Which one?', 'Where should it go?'. Never two questions joined by 'and' — there is only one answer field.",
          },
          why: { type: "string", description: "One clause of justification" },
          assumed: {
            type: "string",
            description:
              "For a choice blank, one of its option ids. For an open blank, the text itself. Never empty.",
          },
          prefill: {
            type: "string",
            description: "Open blanks only. Same value as `assumed`.",
          },
          weight: { type: "number", description: "0..1" },
          role: {
            type: "string",
            enum: ["destination", "trigger", "subject", "criterion", "detail"],
          },
          options: {
            type: "array",
            description: "Choice blanks only. Two to four.",
            items: {
              type: "object",
              required: ["id", "label"],
              properties: {
                id: { type: "string" },
                label: {
                  type: "string",
                  description: "Reads inside the sentence: 'to Discord'",
                },
                hint: { type: "string" },
              },
            },
          },
        },
      },
    },
    destinationId: {
      type: "string",
      description: "One of the destination ids offered below",
    },
    unavailableDestination: {
      type: "string",
      description:
        "Set only when the request named a destination by name that is not in the offered list — e.g. 'Slack'. Just the name.",
    },
    trigger: { type: "string" },
  },
} as const;

/**
 * Complete requests, shown so the model sees the shape of a finished sentence.
 *
 * Drawn from the benchmark rather than written fresh: those are the only
 * user-phrased requests in the codebase that are known to be buildable.
 */
function exampleRequests(limit: number): string[] {
  return BENCHMARK_CASES.slice(0, limit).map((entry) => entry.prompt);
}

export interface BriefPromptInput {
  destinations: BriefDestination[];
  triggers: WorkflowTrigger[];
  /** Providers the org has connected, so the model stops asking about them. */
  connectedProviders: ReadonlySet<string>;
}

export function buildBriefSystemPrompt(input: BriefPromptInput): string {
  const destinations = input.destinations
    .map(
      (destination) =>
        `- ${destination.id}: ${destination.label}${
          destination.requiresConnection
            ? " (the account is not linked yet — offer it anyway if they asked for it; they will be prompted to link it)"
            : ""
        }`
    )
    .join("\n");

  const connected = input.connectedProviders.size
    ? `Already connected, so do not ask about them: ${[...input.connectedProviders].join(", ")}.`
    : `Nothing is connected to this workspace yet.`;

  return `You read a person's request back to them as one sentence, with the parts they did not say left as gaps they can fill.

Return ONLY a JSON object matching the schema. No prose, no markdown fences.

# What you are doing

People describe the interesting half of a job and leave out the obvious half. "Triage my support email" never says what to do with the triage, because to the person asking that goes without saying. Your job is to write the whole sentence — including the half they left out — and to mark the places where you had to guess.

The sentence is what they will read and correct. Use their words wherever you can. It must be grammatical before anything is answered, because that is the state they see first.

# Gaps

Rank every gap by how differently the workflow would be built if you guessed wrong. Ask only the top ${MAX_ASKED_BLANKS}.

1. Where the result goes, when more than one destination is offered. Guessing this wrong makes the whole workflow useless. It is always rank 1.
2. What starts it, when the request implies a schedule or an incoming message but does not say which. A manual workflow that should have been email-triggered is a different workflow.
3. What the judgement is made on — the criterion, the categories, the threshold. "Urgent" means nothing until it means something.
4. Everything else: tone, length, format, wording. Never ask about these.

A gap you can fill from the request is not a gap — with one exception.

Where the result goes is ALWAYS a blank, even when the request says it. It is
the only part of a workflow that is guaranteed to matter, and "email it to me"
does not say which of several ways of emailing. Emit a destination blank with
every destination as an option, and put its slot where the delivery is
described so the sentence still reads. This is not a question — it is
pre-filled with your assumption and they can ignore it — so it does not count
against the ${MAX_ASKED_BLANKS} you may ask.

A blank is one question with one answer. "What starts this, and which blog
post?" is two, and the person gets a single box to answer both in — so split it,
or ask only the half that matters more.

Every blank carries "assumed": what you would build if they never answered. Never empty, never "TBD", never a question. For a choice blank it must be one of that blank's option ids. They can skip every blank, and what they get must still be the most likely thing they wanted.

Never say you do not understand. You propose; they correct.

# Where results can go

These are the only destinations this workspace can actually reach. Never invent one.

${destinations}

If the request names one of these by name, use it — including one whose account
is not linked yet. Do not quietly substitute a different destination for the one
they asked for; being sent to link an account is a far better outcome than
silently getting something else.

If the request names somewhere that is *not* on this list at all, put that name
in "unavailableDestination" and pick the closest thing that is. Substituting is
right; substituting in silence is not, and that field is how the person gets
told.

But never *assume* an unlinked one. It can be an option on a blank, and it can
be what they picked, but the "assumed" value must always be something that works
right now.

${connected}

# Triggers

${input.triggers.join(", ")}. Use "manual" unless the request says how it starts.

# When you cannot do it

If you cannot state the request as one sentence with at most ${MAX_ASKED_BLANKS} gaps — because it is too vague, or it is several unrelated jobs — return exactly {"insufficient": true} and nothing else. Do not guess wildly to fill the shape.

# Requests that are already complete, for tone

${exampleRequests(3)
  .map((prompt) => `- ${prompt}`)
  .join("\n")}

# Example of the output shape

For "post my blog updates to social media", where discord and x are both offered:

{
  "title": "Post blog updates",
  "segments": [
    { "kind": "text", "text": "When a new blog post appears, write a short summary and " },
    { "kind": "slot", "blankId": "dest" },
    { "kind": "text", "text": "." }
  ],
  "blanks": [
    {
      "id": "dest",
      "type": "choice",
      "question": "Which one?",
      "assumed": "discord",
      "weight": 1,
      "role": "destination",
      "options": [
        { "id": "discord", "label": "post it to Discord" },
        { "id": "x", "label": "post it to X" }
      ]
    }
  ],
  "destinationId": "discord",
  "trigger": "manual"
}
`;
}

export function buildBriefUserPrompt(request: string): string {
  return `Read this request back to me:\n\n${request}`;
}
