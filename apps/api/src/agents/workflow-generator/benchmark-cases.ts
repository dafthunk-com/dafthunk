import type { WorkflowTrigger } from "@dafthunk/types";

import type { OrgResourceType } from "./org-resources";

/**
 * One request per shipped template, phrased the way a user would.
 *
 * The templates are the only hand-verified graphs in the codebase, so they make
 * a fair yardstick: if the generator can reach something equivalent from a
 * plain sentence, it can handle the shape of work people actually ask for.
 *
 * `expectTrigger` is asserted; node choice deliberately is not. There are many
 * valid graphs for each of these, and pinning the exact nodes would measure
 * imitation rather than correctness.
 */
export interface BenchmarkCase {
  templateId: string;
  prompt: string;
  expectTrigger: WorkflowTrigger;
}

/**
 * One thing the graph has to be able to do, satisfied by any node that does it.
 *
 * `anyOf` is a set rather than a type because the point is capability, not
 * imitation: a table read is a table read whether it arrives as a query or a
 * row fetch, and pinning one of them would fail a graph that is not wrong. Keep
 * these generous — a requirement should fail only when nothing in the graph can
 * do the job at all.
 */
export interface Requirement {
  /** What the workflow could not do without it, phrased for the failure line. */
  capability: string;
  anyOf: readonly string[];
}

/**
 * What the runner needs from a case, whichever suite it came from.
 *
 * `BenchmarkCase` keys its label `templateId` because that id is resolved
 * against the shipped templates elsewhere; the runner never resolves anything,
 * so both suites collapse to this at the door.
 */
export interface GenerationCase {
  id: string;
  prompt: string;
  expectTrigger: WorkflowTrigger;
  /**
   * Nodes the graph has to contain, by capability.
   *
   * The trigger alone says a request was routed to the right entry point, not
   * that anything downstream does what was asked. A workflow that validates,
   * picks `form_request`, and never touches a table is a pass on trigger and a
   * failure on the request — these are what tell the two apart.
   */
  requires?: readonly Requirement[];
  /**
   * Org resources the graph has to actually bind.
   *
   * Distinct from `requires` because the failure is distinct: a database node
   * with no table selected is the right node wired to nothing, and it validates
   * — `database` and `schema` inputs are optional on the node types that carry
   * them. Checked by parameter type rather than input name, so it holds for
   * whichever node the model reached for.
   */
  binds?: readonly OrgResourceType[];
}

export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    templateId: "text-summarization",
    prompt: "Summarize a long piece of text with AI and show me the summary",
    expectTrigger: "manual",
  },
  {
    templateId: "sentiment-analysis",
    prompt: "Tell me whether a piece of text is positive or negative",
    expectTrigger: "manual",
  },
  {
    templateId: "text-translation",
    prompt: "Translate some text from English into French",
    expectTrigger: "manual",
  },
  {
    templateId: "text-formatter",
    prompt: "Fill a greeting template with a name and a city",
    expectTrigger: "manual",
  },
  {
    templateId: "image-generation",
    prompt: "Generate an image from a text description",
    expectTrigger: "manual",
  },
  {
    templateId: "image-description",
    prompt: "Take an image and describe what is in it",
    expectTrigger: "manual",
  },
  {
    templateId: "speech-to-text",
    prompt: "Transcribe an audio recording into text",
    expectTrigger: "manual",
  },
  {
    templateId: "text-to-speech",
    prompt: "Turn a sentence into spoken audio",
    expectTrigger: "manual",
  },
  {
    templateId: "outline-and-write",
    prompt:
      "Write an article in two steps: first an outline, then the full article from that outline",
    expectTrigger: "manual",
  },
  {
    templateId: "parallel-article-card",
    prompt:
      "For one article, produce a summary, a list of keywords and a title, then combine them into a single card",
    expectTrigger: "manual",
  },
  {
    templateId: "support-routing",
    prompt:
      "Classify a support message and route it down a different branch depending on the category, then merge the branches",
    expectTrigger: "manual",
  },
  {
    templateId: "conditional-branching",
    prompt:
      "Take a number and follow one branch if it is above a threshold and another if it is below, then join them",
    expectTrigger: "manual",
  },
  {
    templateId: "ai-calculator",
    prompt: "Answer a maths question using AI",
    expectTrigger: "manual",
  },
  {
    templateId: "wiki-research-agent",
    prompt: "Answer a factual question by looking things up on Wikipedia",
    expectTrigger: "manual",
  },
  {
    templateId: "web-screenshot",
    prompt: "Take a screenshot of a web page",
    expectTrigger: "manual",
  },
  {
    templateId: "image-processing",
    prompt: "Apply a colour effect to a photo",
    expectTrigger: "manual",
  },
  {
    templateId: "3d-shape",
    prompt: "Build a 3D shape by subtracting a sphere from a cube",
    expectTrigger: "manual",
  },
  {
    templateId: "http-echo",
    prompt:
      "An HTTP endpoint that echoes the request body back in the response",
    expectTrigger: "http_request",
  },
  {
    templateId: "image-to-text",
    prompt:
      "An HTTP endpoint that takes an image, extracts the text in it and returns it as speech",
    expectTrigger: "http_request",
  },
  {
    templateId: "email-reply",
    prompt: "When an email arrives, write a reply with AI and send it back",
    expectTrigger: "email_message",
  },
  {
    templateId: "discord-bot",
    prompt: "Reply to Discord messages using AI",
    expectTrigger: "discord_event",
  },
  {
    templateId: "telegram-bot",
    prompt: "Reply to Telegram messages using AI",
    expectTrigger: "telegram_event",
  },
  {
    templateId: "whatsapp-bot",
    prompt: "Reply to WhatsApp messages using AI",
    expectTrigger: "whatsapp_event",
  },
];

/**
 * The triggers and capabilities no shipped template exercises.
 *
 * Kept out of `BENCHMARK_CASES` because `templateId` there is not a label:
 * `catalog-selection.test.ts` resolves it against `workflowTemplates` and throws
 * when it finds nothing. Nothing below has a template behind it, so it gets its
 * own array. The benchmark runs these exactly like the template cases: a valid
 * graph has to come out, and the trigger has to be the one the sentence
 * implies.
 *
 * Neither array is user-facing any more. Both used to double as the sentences
 * offered on the brief screen, which is why the prompts here are terse to the
 * point of being unappealing — they are written to isolate one capability. The
 * suggestions moved to `BRIEF_EXAMPLES`, which is chosen for the opposite
 * reason, and these are free to stay minimal.
 *
 * Two things shape the phrasing. Each prompt describes the smallest workflow
 * that does the job, because the generator builds what it is asked for — a
 * request carrying a step it does not need measures whether the model follows
 * padding, not whether it can wire a graph. And where the work genuinely needs
 * reasoning, the request says what makes it hard rather than naming a model, so
 * the catalog's agentic node is the one that fits instead of a single cheap
 * pass. `research-agent` is the case that turns on this: drop "several lookups"
 * and one call to any model answers it.
 *
 * The trigger is the assertion, so each sentence has to settle it on its own.
 * That is why the two asynchronous cases say nobody is waiting for an answer —
 * `webhook-alert` and `form-signup` are otherwise indistinguishable from their
 * synchronous counterparts, and `form` alone normalizes to `form_request`.
 */
/**
 * Capability sets, named for what they do rather than what they are.
 *
 * Written out here so a case reads as a sentence and so adding a node to the
 * catalog is one edit rather than one per case that could use it.
 */
const READS_A_TABLE = [
  "database-query",
  "database-get-row",
  "database-row-exists",
  "database-get-row-count",
  "database-list-tables",
  "database-describe-table",
  "database-export-table",
  "parquet-query",
] as const;

const WRITES_A_ROW = [
  "database-put-row",
  "database-execute",
  "database-import-table",
  "database-create-table",
] as const;

const SEARCHES_A_DATASET = ["dataset-ai-search", "dataset-search"] as const;

/** Answers the person who is waiting — the synchronous triggers' obligation. */
const ANSWERS_THE_CALLER = ["form-response", "http-response"] as const;

/** Puts a form in front of a human mid-run and waits, rather than at the edge. */
const ASKS_A_HUMAN = [
  "create-form",
  "create-feedback-form",
  "wait-for-form",
] as const;

/** Hands back addressable fields, by whichever route the graph took. */
const RETURNS_FIELDS = [
  "json-extract-string",
  "json-extract-number",
  "json-extract-boolean",
  "json-extract-object",
  "json-extract-all",
  "output-json",
] as const;

export const COVERAGE_CASES: GenerationCase[] = [
  // ── Triggers ────────────────────────────────────────────────────────────
  {
    id: "slack-bot",
    prompt: "Reply to Slack messages using AI",
    expectTrigger: "slack_event",
  },
  {
    id: "scheduled-standup",
    prompt:
      "Every weekday at 9am, write a short standup reminder and post it to Slack",
    expectTrigger: "scheduled",
  },
  {
    id: "queue-classify",
    prompt:
      "When a message arrives on my queue, classify the text it carries and save the result to a table",
    expectTrigger: "queue_message",
    requires: [{ capability: "write a row", anyOf: WRITES_A_ROW }],
    binds: ["database"],
  },
  {
    id: "webhook-alert",
    prompt:
      "Take webhook calls from my monitoring tool, turn the payload into a one-line alert with AI and post it to Discord. Nothing needs to go back to the caller.",
    expectTrigger: "http_webhook",
  },
  {
    /**
     * The hardest case here, and the one that earns its place.
     *
     * A form trigger declares no output ports — they are derived from the
     * schema the form is built on — so a graph that reaches for the submitted
     * text before binding a schema has nowhere to read it from, and the
     * synchronous form owes the submitter a `form-response` on top. Both
     * conditions are asserted rather than assumed.
     */
    id: "form-answer",
    prompt:
      "A form where someone types a question about our product, and the answer is written by AI and shown to them on the page",
    expectTrigger: "form_request",
    requires: [
      { capability: "answer the submitter", anyOf: ANSWERS_THE_CALLER },
    ],
    binds: ["schema"],
  },
  {
    id: "form-signup",
    prompt:
      "A signup form that records each submission in a table. Whoever fills it in is not waiting for an answer.",
    expectTrigger: "form_webhook",
    requires: [{ capability: "write a row", anyOf: WRITES_A_ROW }],
    binds: ["schema", "database"],
  },

  // ── Capabilities ────────────────────────────────────────────────────────
  {
    id: "image-generation-endpoint",
    prompt:
      "An HTTP endpoint that takes a text description and returns a generated image",
    expectTrigger: "http_request",
  },
  {
    id: "database-lookup-endpoint",
    prompt:
      "An HTTP endpoint that looks up a customer by email in my table and returns their record",
    expectTrigger: "http_request",
    requires: [
      { capability: "read a table", anyOf: READS_A_TABLE },
      { capability: "answer the caller", anyOf: ANSWERS_THE_CALLER },
    ],
    binds: ["database"],
  },
  {
    /**
     * The case that asks for an agent rather than a model.
     *
     * "Several lookups" and "follow up on what it finds" are the whole point:
     * they describe work a single pass cannot do, which is what makes the
     * agentic node the simplest answer here rather than the expensive one.
     */
    id: "research-agent",
    prompt:
      "Answer a research question that needs several web lookups, using an AI agent that can search and follow up on what it finds",
    expectTrigger: "manual",
  },
  {
    id: "dataset-question",
    prompt:
      "Answer a question from the documents in my dataset and show me the answer",
    expectTrigger: "manual",
    requires: [{ capability: "search a dataset", anyOf: SEARCHES_A_DATASET }],
    binds: ["dataset"],
  },
  {
    /**
     * One node, not two. Transcribing and then summarizing is the graph people
     * sketch; the catalog's audio understanding node reads the recording and
     * answers in a single hop, and asking for the summary rather than the
     * transcript is what lets the generator find it.
     */
    id: "audio-note-summary",
    prompt:
      "Take a voice note and give me a short written summary of what was said",
    expectTrigger: "manual",
  },

  // ── Internal concepts ───────────────────────────────────────────────────
  // The parts of Dafthunk a request never names. Nobody writes "bind a schema"
  // or "pause for a human"; they describe an outcome that cannot be reached
  // without one, which is why every case below carries a condition beyond its
  // trigger.
  {
    /**
     * Structured output, which is a schema in the one place it is not a form.
     *
     * "Give me back the three fields" is the only phrasing a person uses for
     * it, and a graph that returns a paragraph containing those numbers has
     * answered the sentence while missing the request.
     */
    id: "structured-extraction",
    // "Out of a supplier email" was the first phrasing and it picked
    // `email_message`, correctly: naming a source names a trigger. The case is
    // about the shape of the answer, so the source has to stay inert.
    prompt:
      "Pull the invoice number, date and total out of a block of invoice text and give them back as three separate fields rather than prose",
    expectTrigger: "manual",
    /**
     * Asserted as fields-not-prose rather than `binds: ["schema"]`.
     *
     * A bound schema is one way to do this and JSON extraction is another, and
     * the measured run took the second: ten nodes, clean, no schema in sight.
     * Requiring the schema would have marked a working graph wrong, which is
     * the failure mode `Requirement.anyOf` exists to avoid — the schema concept
     * is covered where it is genuinely load-bearing, on the form cases.
     */
    requires: [
      { capability: "return fields rather than prose", anyOf: RETURNS_FIELDS },
    ],
  },
  {
    /**
     * A human in the middle of a run, not at its edge.
     *
     * The form triggers start a workflow; this one pauses a workflow that is
     * already running and resumes it when someone answers. The distinction is
     * invisible in the request and entirely visible in the graph.
     */
    id: "human-approval",
    prompt:
      "Draft a customer reply with AI, then have someone review and approve it before it is sent",
    expectTrigger: "manual",
    requires: [{ capability: "ask a human mid-run", anyOf: ASKS_A_HUMAN }],
  },
  {
    /**
     * A table read on a schedule, which is the reporting shape.
     *
     * Pairs the two resource concepts a digest needs — a table to read and a
     * destination to deliver to — on the trigger that has neither an inbound
     * payload nor a caller waiting.
     */
    id: "nightly-table-report",
    prompt:
      "Every night, count the rows added to my customers table that day and email me the number",
    expectTrigger: "scheduled",
    requires: [{ capability: "read a table", anyOf: READS_A_TABLE }],
    binds: ["database"],
  },
];
