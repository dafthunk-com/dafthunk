import type { BriefDestination, WorkflowTrigger } from "@dafthunk/types";
import { BRIEF_BLANK_ROLES } from "@dafthunk/types";
import { BRIEF_EXAMPLES } from "@dafthunk/utils";

import { MAX_ASKED_BLANKS } from "../config";
import { type GroundingContext, projectGroundingForBrief } from "../grounding";

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
      description:
        "One blank per guessed moving part, highest weight first. Do not withhold one to stay under a question budget.",
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
            enum: BRIEF_BLANK_ROLES,
          },
          grounding: {
            type: "object",
            description:
              "Only when the options are the workspace's own components.",
            properties: {
              family: {
                type: "string",
                description:
                  "database, dataset, queue, email, schema, discord, telegram, whatsapp or slack",
              },
            },
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
                triggerValue: {
                  type: "string",
                  description:
                    "Trigger blanks only: the trigger kind this option implies.",
                },
                resourceName: {
                  type: "string",
                  description:
                    "Grounded blanks only: the workspace component's name, exactly as listed. The server resolves it — never invent one.",
                },
                createNew: {
                  type: "boolean",
                  description:
                    "Grounded blanks only: choosing this creates a new component instead of reusing one.",
                },
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
 * The same list the person is offered when their request is too thin, and for
 * the same reason: these are written as one sentence carrying a trigger, a job
 * and a destination, which is exactly the shape a brief has to end up in. They
 * were drawn from the benchmark until the two sets pulled apart — a case tuned
 * to isolate one capability teaches a narrower sentence than a brief wants.
 */
function exampleRequests(limit: number): string[] {
  return BRIEF_EXAMPLES.slice(0, limit).map((example) => example.prompt);
}

export interface BriefPromptInput {
  destinations: BriefDestination[];
  triggers: WorkflowTrigger[];
  /** Providers the org has connected, so the model stops asking about them. */
  connectedProviders: ReadonlySet<string>;
  /** What the workspace owns, so the sentence can say so. */
  grounding?: GroundingContext;
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

# The moving parts

Every workflow has four moving parts. Go through them one by one:

1. TRIGGER — what starts it, and when, if that is a schedule.
2. SOURCE — what it reads or watches: an inbox, a document collection, a feed, the text they will paste in.
3. JUDGEMENT — the criterion, the categories, the threshold. "Urgent" means nothing until it means something.
4. DESTINATION — where the result goes.

For each, decide: stated (their words already say it), guessed (you filled it
in), or irrelevant (this job has no such part). Then:

- TRIGGER and DESTINATION are never irrelevant, and each gets a blank even
  when stated — pre-filled with what they said, weight 0.2 or less, its slot
  placed where the sentence describes that part. A scheduled trigger's blank
  carries the time: "every morning at 8" is an option label, and the hour is
  exactly the kind of guess this exists to surface. Every trigger option
  carries "triggerValue": the trigger kind choosing it implies. Offer "when
  you run it" and a schedule freely; offer other kinds only when the request
  itself points at them.
- The destination blank offers every destination below as an option. "Email it
  to me" does not say which of several ways of emailing, so it is a blank even
  when stated. It is not one of your questions — it arrives pre-filled and
  they can ignore it.
- A stated SOURCE or JUDGEMENT is not a gap: no blank.
- A guessed part always gets a blank. Do not withhold one to stay under a
  budget: only the heaviest ${MAX_ASKED_BLANKS} guesses are put as questions;
  the rest stay visible and tappable in the sentence. Weight says how
  differently the workflow would be built if the guess is wrong — it decides
  which blanks become questions, nothing else.
- Never ask about tone, length, format or wording.

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

${input.grounding ? `${projectGroundingForBrief(input.grounding)}\n` : ""}
# Triggers

${input.triggers.join(", ")}. Use "manual" unless the request says how it starts. These are also the only legal "triggerValue"s.

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
    { "kind": "slot", "blankId": "when" },
    { "kind": "text", "text": ", write a short summary of the latest blog post and " },
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
    },
    {
      "id": "when",
      "type": "choice",
      "question": "What starts it?",
      "assumed": "manual",
      "weight": 0.2,
      "role": "trigger",
      "options": [
        { "id": "manual", "label": "When you run this", "triggerValue": "manual" },
        { "id": "morning", "label": "Every morning at 8", "triggerValue": "scheduled" }
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
