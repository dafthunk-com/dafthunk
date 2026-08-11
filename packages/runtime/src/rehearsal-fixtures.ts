import type { NodeType } from "@dafthunk/types";

import type { ParameterValue } from "./node-types";

/**
 * Synthetic outputs for nodes stubbed during a rehearsal execution.
 *
 * A stub has to hand downstream nodes something shaped like the truth, or the
 * rehearsal collapses one step later: a digest node fed `{}` writes an empty
 * digest, and the outcome screen then demos a workflow that appears to do
 * nothing. Three rules, in order of preference:
 *
 * 1. A curated fixture for the handful of read nodes whose output shape
 *    downstream steps genuinely depend on (an inbox listing, a post feed).
 * 2. Echo: an input with the same name and a matching runtime type is what a
 *    write node would have sent — `share-post-x` echoes its composed `text`.
 * 3. A generic value per declared type. Strings are `rehearsal-…` so a
 *    receipt id can never be mistaken for a real one.
 */

/** A fixed instant, so rehearsal outputs are deterministic and testable. */
const REHEARSAL_DATE = "2026-01-05T09:12:00.000Z";

const SAMPLE_EMAILS = [
  {
    id: "rehearsal-msg-1",
    threadId: "rehearsal-thread-1",
    from: "Ada Lovelace <ada@example.com>",
    to: "you@example.com",
    subject: "Quarterly numbers are in",
    date: "Mon, 5 Jan 2026 09:12:00 +0000",
    snippet:
      "The Q4 figures landed this morning — revenue is up 12% and the board wants a summary by Friday.",
    labels: ["INBOX"],
    timestamp: REHEARSAL_DATE,
  },
  {
    id: "rehearsal-msg-2",
    threadId: "rehearsal-thread-2",
    from: "Grace Hopper <grace@example.com>",
    to: "you@example.com",
    subject: "Re: Demo on Thursday",
    date: "Mon, 5 Jan 2026 08:47:00 +0000",
    snippet:
      "Thursday works. Can you send the agenda beforehand so the team can prepare questions?",
    labels: ["INBOX", "IMPORTANT"],
    timestamp: "2026-01-05T08:47:00.000Z",
  },
];

const SAMPLE_EVENTS = [
  {
    id: "rehearsal-event-1",
    summary: "Team stand-up",
    location: "Meeting room 2",
    status: "confirmed",
    start: { dateTime: "2026-01-05T10:00:00Z" },
    end: { dateTime: "2026-01-05T10:15:00Z" },
  },
  {
    id: "rehearsal-event-2",
    summary: "Demo with the design team",
    location: "Video call",
    status: "confirmed",
    start: { dateTime: "2026-01-05T14:00:00Z" },
    end: { dateTime: "2026-01-05T15:00:00Z" },
  },
];

const SAMPLE_REDDIT_POSTS = [
  {
    id: "rehearsal-post-1",
    name: "t3_rehearsal1",
    title: "What tooling do you use for workflow automation?",
    author: "sample_user",
    subreddit: "automation",
    score: 128,
    numComments: 42,
    createdUtc: 1767604320,
    permalink: "/r/automation/comments/rehearsal1",
    url: "https://example.com/rehearsal-post-1",
    selftext: "Looking for recommendations on automating routine reports.",
    over18: false,
  },
  {
    id: "rehearsal-post-2",
    name: "t3_rehearsal2",
    title: "Show and tell: my morning-digest pipeline",
    author: "another_user",
    subreddit: "automation",
    score: 64,
    numComments: 17,
    createdUtc: 1767600000,
    permalink: "/r/automation/comments/rehearsal2",
    url: "https://example.com/rehearsal-post-2",
    selftext: "",
    over18: false,
  },
];

const SAMPLE_X_POSTS = [
  {
    id: "rehearsal-x-1",
    text: "Shipping a small tool that turns your inbox into a morning digest.",
    author_id: "rehearsal-author-1",
    created_at: REHEARSAL_DATE,
  },
  {
    id: "rehearsal-x-2",
    text: "Automation tip: rehearse a workflow before you let it touch anything real.",
    author_id: "rehearsal-author-2",
    created_at: "2026-01-05T08:30:00.000Z",
  },
];

const SAMPLE_WORDPRESS_POSTS = [
  {
    id: 101,
    title: "How we automated our weekly report",
    excerpt: "A walkthrough of the pipeline that writes our Monday summary.",
    link: "https://example.com/blog/weekly-report-automation",
    date: REHEARSAL_DATE,
    status: "publish",
  },
  {
    id: 102,
    title: "Five workflows worth copying",
    excerpt: "The five automations that save us the most time.",
    link: "https://example.com/blog/five-workflows",
    date: "2026-01-02T11:00:00.000Z",
    status: "publish",
  },
];

/**
 * Curated fixtures for the read nodes most likely to be rehearsed with no
 * connected account. Keyed by node type; values are complete output maps.
 * Deliberately short — everything else falls through to the generic rules.
 */
const CURATED_FIXTURES: Readonly<
  Record<string, Record<string, ParameterValue>>
> = {
  "read-inbox-google-mail": { messages: SAMPLE_EMAILS, count: 2 },
  "search-messages-google-mail": { messages: SAMPLE_EMAILS, count: 2 },
  "list-events-google-calendar": { events: SAMPLE_EVENTS, count: 2 },
  "list-posts-reddit": { posts: SAMPLE_REDDIT_POSTS, count: 2 },
  "search-posts-x": { results: SAMPLE_X_POSTS, count: 2 },
  "get-repository-github": {
    id: "rehearsal-repo-1",
    name: "sample-repository",
    fullName: "sample-org/sample-repository",
    description: "A stand-in repository for rehearsal runs.",
    url: "https://example.com/sample-org/sample-repository",
    stars: 42,
    forks: 7,
    openIssues: 3,
  },
  "list-posts-wordpress": { posts: SAMPLE_WORDPRESS_POSTS, count: 2 },
};

/** A 1×1 transparent PNG — the one blob a stub still produces. */
const REHEARSAL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

/** Whether an input value can stand in for an output of the declared type. */
function echoes(declaredType: string, value: ParameterValue): boolean {
  switch (declaredType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "json":
      // A blob-shaped value must not masquerade as JSON; fall through to the
      // generic fixture instead of echoing binary data into a json port.
      return (
        typeof value === "object" &&
        value !== null &&
        !("data" in value && "mimeType" in value)
      );
    default:
      return false;
  }
}

function genericValue(
  output: NodeType["outputs"][number]
): ParameterValue | undefined {
  switch (output.type) {
    case "string":
    case "any":
      return `rehearsal-${output.name}`;
    case "date":
      return REHEARSAL_DATE;
    case "number":
      return 0;
    case "boolean":
      return true;
    case "json":
      return output.repeated ? [] : { rehearsal: true };
    case "image":
      return { data: REHEARSAL_PNG, mimeType: "image/png" };
    default:
      // Remaining blob/resource types are omitted: a fabricated video or
      // database reference would fail the first consumer anyway, and an
      // absent output skips it visibly instead.
      return undefined;
  }
}

/**
 * Synthetic outputs for one stubbed node, keyed by declared output name.
 *
 * Only declared outputs are produced, so `nodeOutputsToApi` converts each
 * value against its true type and the receipt names the outcome screen keys
 * off (`isDeliveryNode`) survive unchanged.
 */
export function synthesizeOutputs(
  nodeType: NodeType,
  composedInputs: Record<string, ParameterValue>
): Record<string, ParameterValue> {
  const curated = CURATED_FIXTURES[nodeType.type];
  const outputs: Record<string, ParameterValue> = {};

  for (const output of nodeType.outputs) {
    if (curated && curated[output.name] !== undefined) {
      outputs[output.name] = curated[output.name];
      continue;
    }

    const input = composedInputs[output.name];
    if (input !== undefined && echoes(output.type, input)) {
      outputs[output.name] = input;
      continue;
    }

    const value = genericValue(output);
    if (value !== undefined) {
      outputs[output.name] = value;
    }
  }

  return outputs;
}
