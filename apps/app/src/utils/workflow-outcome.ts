import type { Node, Workflow, WorkflowExecution } from "@dafthunk/types";

/**
 * Nodes with no outgoing edge — the ones whose output is the actual answer.
 *
 * The outcome screen renders only these and hides the rest: someone who asked
 * for a summary wants the summary, not the plumbing that carried it.
 */
export function terminalNodeIds(workflow: Workflow): Set<string> {
  const withOutgoing = new Set(workflow.edges.map((edge) => edge.source));
  return new Set(
    workflow.nodes.map((node) => node.id).filter((id) => !withOutgoing.has(id))
  );
}

/**
 * Output names that are a receipt for an action, not the result of one.
 *
 * A node that sends something answers with proof of sending: an id, a count, a
 * status. None of that is what the person asked for, and showing it in place of
 * the answer is how "1" — `notify-me`'s `recipientCount`, meaning one person
 * was emailed — came to be presented as the result of a Hacker News digest.
 */
const RECEIPT_OUTPUTS: ReadonlySet<string> = new Set([
  "messageId",
  "message_id",
  "id",
  "status",
  "recipientCount",
  "recipient_count",
  "error",
]);

/**
 * Inputs that say where something goes rather than what it says.
 *
 * Dropped from the preview because an address is not content — a delivery whose
 * body is shown under the recipient's email address reads as a form, not an
 * answer.
 */
const ADDRESSING_INPUTS: ReadonlySet<string> = new Set([
  "to",
  "cc",
  "bcc",
  "from",
  "replyTo",
  "reply_to",
  "threadId",
  "thread_id",
  "channel",
  "channelId",
  "chatId",
  "chat_id",
  "recipient",
  "subreddit",
  "repo",
  "owner",
  "branch",
  "path",
  "calendarId",
]);

/**
 * Whether this node's job is to hand something over rather than to produce it.
 *
 * Structural rather than a list of types, so a node nobody thought to enumerate
 * still behaves: if everything a node returns is a receipt, then whatever it was
 * *given* is the thing worth showing. `output-text` and friends fail this test
 * and keep rendering exactly as they did.
 */
export function isDeliveryNode(node: Node): boolean {
  if (node.outputs.length === 0) return false;
  return node.outputs.every((output) => RECEIPT_OUTPUTS.has(output.name));
}

/** Past tense, for the line that says what happened. Display copy only. */
const DELIVERED_PHRASES: Record<string, string> = {
  "notify-me": "Emailed to you",
  "send-email": "Email sent",
  "send-email-google-mail": "Sent from your Gmail",
  "send-message-discord": "Posted to Discord",
  "send-message-slack": "Posted to Slack",
  "send-message-telegram": "Sent on Telegram",
  "send-message-whatsapp": "Sent on WhatsApp",
  "share-post-x": "Posted to X",
  "share-post-linkedin": "Posted to LinkedIn",
  "share-post-reddit": "Posted to Reddit",
  "create-post-wordpress": "Published to WordPress",
  "create-update-file-github": "Committed to GitHub",
  "create-event-google-calendar": "Added to your calendar",
};

/**
 * What to say happened, for a node that delivered something.
 *
 * Deliberately not derived from the brief's destination label: those are
 * infinitives written to complete "the workflow must …", and turning "commit it
 * to your GitHub repository" into past tense is a conjugation problem no
 * transformation gets right. An unknown type falls back to something true of
 * every entry here.
 */
export function deliveredPhrase(node: Node): string {
  return DELIVERED_PHRASES[node.type] ?? "Sent";
}

/** One value a delivery node was handed. */
export interface DeliveredValue {
  /** The input it arrived on, for a label when there is more than one. */
  name: string;
  text: string;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() ? value : undefined;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

/** One step that errored in a run, named for a person. */
export interface FailedStep {
  name: string;
  /** First line only — a stack trace's signal is its opening sentence. */
  error?: string;
}

/**
 * The steps that failed, by name.
 *
 * The `run_result` frame keeps every node's status and error; the outcome view
 * filters to completed nodes and would otherwise hide the diagnosis while the
 * copy asks the user to say what should change. "It did not finish cleanly"
 * with no subject is a question the screen already knows the answer to.
 */
export function failedSteps(
  workflow: Workflow,
  execution: WorkflowExecution
): FailedStep[] {
  const nameById = new Map(workflow.nodes.map((node) => [node.id, node.name]));

  return execution.nodeExecutions
    .filter((entry) => entry.status === "error")
    .map((entry) => {
      const firstLine = entry.error?.split("\n")[0]?.trim();
      return {
        name: nameById.get(entry.nodeId) || "One step",
        ...(firstLine ? { error: firstLine.slice(0, 200) } : {}),
      };
    });
}

/**
 * What a delivery node was actually given, recovered without its `inputs`.
 *
 * `previewExecution` strips node inputs from the frame — reasonable for an
 * intermediate node, where they are a second copy of the previous node's
 * output, and exactly wrong here, where they are the answer. Rather than widen
 * the frame, the value is recovered from what is already in it: an input fed by
 * an edge is the source node's output, and an input set to a literal is on the
 * graph itself.
 */
export function deliveredValues(
  workflow: Workflow,
  execution: WorkflowExecution,
  node: Node
): DeliveredValue[] {
  const outputsByNode = new Map(
    execution.nodeExecutions.map((entry) => [entry.nodeId, entry.outputs])
  );

  const values: DeliveredValue[] = [];

  for (const input of node.inputs) {
    if (ADDRESSING_INPUTS.has(input.name)) continue;

    const edge = workflow.edges.find(
      (candidate) =>
        candidate.target === node.id && candidate.targetInput === input.name
    );

    const raw = edge
      ? outputsByNode.get(edge.source)?.[edge.sourceOutput]
      : input.value;

    const text = asText(raw);
    if (text !== undefined) values.push({ name: input.name, text });
  }

  return values;
}
