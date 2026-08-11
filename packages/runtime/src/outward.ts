import type { NodeType } from "@dafthunk/types";

/**
 * Which node types act outside Dafthunk when they run.
 *
 * This classification drives the rehearsal stub rule: during a rehearsal
 * execution, an outward node is replaced with a stub so nothing is posted,
 * sent, or written to a linked account. Getting it wrong in one direction
 * rehearses a step that was safe to run; getting it wrong in the other
 * direction posts to someone's account during a run that promised not to.
 * Those are not comparable, so anything acting on a linked third-party
 * account counts as outward unless it is explicitly known to only read.
 *
 * The lists live beside the node implementations they classify so that a new
 * node lands next to the decision about what it touches.
 */

/**
 * Provider-backed nodes that only read.
 *
 * An allowlist rather than a "writes" list, because a list of writes is wrong
 * the moment a node is added — and wrong in the direction that acts on a real
 * account without asking. A new node is stubbed during rehearsal until someone
 * reads it and decides otherwise.
 */
export const READ_ONLY_TYPES: ReadonlySet<string> = new Set([
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
 * fetching something. Stubbing every one of them would hollow out every
 * rehearsal — which would cost more fidelity than it buys safety.
 */
export const OUTWARD_PLATFORM_TYPES: ReadonlySet<string> = new Set([
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
export function integrationProvider(nodeType: NodeType): string | undefined {
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
