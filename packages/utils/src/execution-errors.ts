/**
 * Error message contract shared between the runtime (which produces these
 * messages) and clients (which detect and react to them).
 *
 * Lives in `@dafthunk/utils` so the format has a single source of truth that
 * both server-side runtime code and the frontend can import without pulling
 * in the full runtime package.
 */

/** Message for a subscription-gated node when the user lacks a subscription. */
export function subscriptionRequiredMessage(
  _nodeId: string,
  nodeType: string
): string {
  return `Subscription required to execute node "${nodeType}". Upgrade your plan to use this feature.`;
}

const SUBSCRIPTION_REQUIRED_PATTERN =
  /^Subscription required to execute node "([^"]+)"\./;

/** True if the given error message was produced by `subscriptionRequiredMessage`. */
export function isSubscriptionRequiredError(
  message: string | null | undefined
): boolean {
  return (
    typeof message === "string" && SUBSCRIPTION_REQUIRED_PATTERN.test(message)
  );
}

/**
 * Extracts the gated node type from a subscription-required error message,
 * or null if the message wasn't produced by `subscriptionRequiredMessage`.
 */
export function parseSubscriptionRequiredError(
  message: string | null | undefined
): { nodeType: string } | null {
  if (typeof message !== "string") return null;
  const match = message.match(SUBSCRIPTION_REQUIRED_PATTERN);
  return match ? { nodeType: match[1] } : null;
}
