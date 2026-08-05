import type { Node, NodeType, OutwardAction, Workflow } from "@dafthunk/types";

/**
 * What a generated workflow would do outside Dafthunk if it ran.
 *
 * The trial run is a real execution against real credentials — there is no
 * dry-run mode and a `share-post` node genuinely posts. So the graph is read
 * before it runs and anything that leaves the platform is put in front of the
 * user first.
 *
 * The classification below fails safe on purpose. Getting it wrong in one
 * direction shows somebody a confirmation they did not need; getting it wrong
 * in the other direction publishes to their account without asking. Those are
 * not comparable, so anything acting on a linked third-party account counts as
 * outward unless it is explicitly known to only read.
 */

/**
 * Provider-backed nodes that only read.
 *
 * An allowlist rather than a "writes" list, because a list of writes is wrong
 * the moment a node is added — and wrong in the direction that posts without
 * asking. A new node is gated until someone reads it and decides otherwise.
 */
const READ_ONLY_TYPES: ReadonlySet<string> = new Set([
  // Google Mail. Note that archiving, trashing, marking and relabelling are
  // absent on purpose: they change the state of the user's real mailbox.
  "read-inbox-google-mail",
  "get-message-google-mail",
  "search-messages-google-mail",
  "check-draft-google-mail",
  // Google Calendar
  "list-calendars-google-calendar",
  "list-events-google-calendar",
  "get-event-google-calendar",
  "search-events-google-calendar",
  "check-availability-google-calendar",
  // GitHub
  "get-file-contents-github",
  "get-repository-github",
  "get-user-github",
  "list-organization-repositories-github",
  "list-user-repositories-github",
  "search-repositories-github",
  // Reddit
  "get-post-reddit",
  "get-subreddit-reddit",
  "get-user-reddit",
  "list-comments-reddit",
  "list-posts-reddit",
  "list-user-comments-reddit",
  "list-user-posts-reddit",
  "search-reddit",
  "search-subreddits-reddit",
  // X
  "get-post-x",
  "get-user-x",
  "list-followers-x",
  "list-following-x",
  "list-user-mentions-x",
  "list-user-posts-x",
  "search-posts-x",
  // LinkedIn
  "get-post-comments-linkedin",
  "get-post-likes-linkedin",
  "get-profile-linkedin",
  // WordPress
  "get-post-wordpress",
  "get-site-wordpress",
  "list-categories-wordpress",
  "list-posts-wordpress",
  "search-wordpress",
]);

/**
 * Nodes that reach a real person without belonging to an OAuth provider.
 *
 * These are bot- and mailbox-backed rather than integration-backed, so the
 * provider rule below cannot see them, but a message from one lands in
 * somebody's inbox or channel just the same.
 *
 * `fetch` is deliberately absent. It leaves the platform, but it acts as
 * nobody: it carries no identity and most generated workflows begin by
 * fetching something. Gating every one of them would put a confirmation in
 * front of every single generation, and a confirmation that always appears is
 * one nobody reads — which would cost more safety than it buys.
 */
const OUTWARD_PLATFORM_TYPES: ReadonlySet<string> = new Set([
  "send-email",
  "notify-me",
  "bot-send-message-slack",
  "bot-send-message-discord",
  "bot-send-dm-discord",
  "send-message-discord",
  "send-dm-discord",
  "send-message-telegram",
  "send-photo-telegram",
  "forward-message-telegram",
  "send-message-whatsapp",
  "send-image-whatsapp",
  "send-template-whatsapp",
]);

/** The `provider` of the first `integration` input a node type declares. */
function integrationProvider(nodeType: NodeType): string | undefined {
  for (const input of nodeType.inputs) {
    if (input.type !== "integration") continue;
    const provider = (input as { provider?: unknown }).provider;
    if (typeof provider === "string") return provider;
  }
  return undefined;
}

/** Whether running this node type would act outside Dafthunk. */
export function isOutward(nodeType: NodeType): boolean {
  if (READ_ONLY_TYPES.has(nodeType.type)) return false;
  if (OUTWARD_PLATFORM_TYPES.has(nodeType.type)) return true;
  return integrationProvider(nodeType) !== undefined;
}

/**
 * Inputs worth showing, and what to call them.
 *
 * Deliberately a short list. The point is to answer "what would this send, and
 * to whom" — a node's `threadId` or its model name answers neither, and a
 * screen that lists every input is one nobody reads.
 */
const SHOWN_INPUTS: Record<string, string> = {
  to: "To",
  cc: "Cc",
  subject: "Subject",
  text: "Message",
  html: "Message",
  body: "Message",
  message: "Message",
  content: "Content",
  title: "Title",
  status: "Post",
  url: "URL",
  channel: "Channel",
  repository: "Repository",
  path: "Path",
};

/** Trim a literal to something that reads on one screen. */
function preview(value: unknown): string | undefined {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
}

/**
 * What a node would send, as far as it is knowable before the run.
 *
 * Only literals set on the node itself. A value arriving over an edge is
 * whatever an earlier step produces, and this must never imply it knows what
 * that will be — an empty list is the honest answer, and the caller says so.
 */
function detailsFor(
  node: Node,
  connectedInputs: ReadonlySet<string>
): OutwardAction["details"] {
  const details: OutwardAction["details"] = [];
  const seen = new Set<string>();

  for (const input of node.inputs ?? []) {
    const label = SHOWN_INPUTS[input.name];
    if (!label || connectedInputs.has(input.name)) continue;
    const value = preview(input.value);
    if (value === undefined) continue;
    // `html` and `text` both map to "Message"; one is enough.
    if (seen.has(label)) continue;
    seen.add(label);
    details.push({ label, value });
  }

  return details;
}

/**
 * Provider ids are wire values — "google-mail", "x" — and reading one back at
 * someone as "your x account" looks like a bug even when it is not.
 */
const PROVIDER_LABELS: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  discord: "Discord",
  reddit: "Reddit",
  github: "GitHub",
  wordpress: "WordPress",
  "google-mail": "Gmail",
  "google-calendar": "Google Calendar",
  "microsoft-teams": "Microsoft Teams",
  "office-365": "Office 365",
};

/** One line describing the act, in the user's terms rather than the graph's. */
function summarize(nodeType: NodeType, provider?: string): string {
  if (provider) {
    const label = PROVIDER_LABELS[provider] ?? provider;
    return `${nodeType.name} — acts on your ${label} account`;
  }
  if (nodeType.type === "send-email" || nodeType.type === "notify-me") {
    return `${nodeType.name} — sends a real email`;
  }
  return `${nodeType.name} — sends a real message`;
}

/**
 * Every outward act in a graph, in the order the user would read them.
 *
 * Takes the live registry rather than a snapshot: a node type absent from it
 * cannot be classified, and an unclassifiable node is treated as outward for
 * the same reason the allowlist is shaped the way it is.
 */
export function outwardActions(
  workflow: Workflow,
  nodeTypes: NodeType[]
): OutwardAction[] {
  const byType = new Map(
    nodeTypes.map((nodeType) => [nodeType.type, nodeType])
  );

  // An input fed by an edge holds no literal worth showing, and showing the
  // stale literal underneath it would misreport what gets sent.
  const connected = new Map<string, Set<string>>();
  for (const edge of workflow.edges) {
    const set = connected.get(edge.target) ?? new Set<string>();
    set.add(edge.targetInput);
    connected.set(edge.target, set);
  }

  const actions: OutwardAction[] = [];

  for (const node of workflow.nodes) {
    const nodeType = byType.get(node.type);
    if (nodeType && !isOutward(nodeType)) continue;

    const provider = nodeType ? integrationProvider(nodeType) : undefined;
    const name = node.name || nodeType?.name || node.type;

    actions.push({
      nodeId: node.id,
      name,
      nodeType: node.type,
      ...(provider ? { provider } : {}),
      summary: nodeType
        ? summarize(nodeType, provider)
        : `${name} — acts outside Dafthunk`,
      details: detailsFor(node, connected.get(node.id) ?? new Set()),
    });
  }

  return actions;
}
