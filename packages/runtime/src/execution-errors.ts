/**
 * Error message formatters for workflow runtime execution.
 *
 * These functions produce the error strings stored in node execution results.
 * They are not thrown or caught — they generate messages for the execution record.
 *
 * The subscription-required message + detection helpers live in
 * `@dafthunk/utils` so the format has a single source of truth that both the
 * runtime (server) and the app (client) can import without coupling.
 */

export {
  isSubscriptionRequiredError,
  parseSubscriptionRequiredError,
  subscriptionRequiredMessage,
} from "@dafthunk/utils";

/** Message for a node ID that doesn't exist in the workflow graph. */
export function nodeNotFoundMessage(nodeId: string): string {
  return `Node not found: ${nodeId}`;
}

/** Message for a node whose type has no registered implementation. */
export function nodeTypeNotImplementedMessage(
  _nodeId: string,
  nodeType: string
): string {
  return `Node type not implemented: ${nodeType}`;
}
