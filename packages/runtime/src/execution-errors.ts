/**
 * Error message formatters for workflow runtime execution.
 *
 * These functions produce the error strings stored in node execution results.
 * They are not thrown or caught — they generate messages for the execution record.
 */

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

/** Message for a subscription-gated node when the user lacks a subscription. */
export function subscriptionRequiredMessage(
  _nodeId: string,
  nodeType: string
): string {
  return `Subscription required to execute node "${nodeType}". Upgrade your plan to use this feature.`;
}
