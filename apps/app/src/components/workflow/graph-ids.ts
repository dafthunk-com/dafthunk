/**
 * Identifier generation for graph elements.
 *
 * These ids were previously derived from `Date.now()`. Any two elements
 * created within the same millisecond — pasting, duplicating a selection, or
 * inserting the multi-node trigger pairs — collided, which produced duplicate
 * React keys and, worse, made the paste/duplicate id remapping rewire edges to
 * the wrong node. Uniqueness has to come from the id itself, not from timing.
 */

/** Unique suffix. Falls back when `crypto.randomUUID` is unavailable
 * (non-secure contexts), where a crash would be worse than a weaker id. */
function uniqueSuffix(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/** Id for a new node, prefixed with its node type for readability in logs. */
export function createNodeId(nodeType?: string): string {
  return `${nodeType || "node"}-${uniqueSuffix()}`;
}

/**
 * Id for a new edge. Derived from its endpoints, which are themselves unique,
 * so two distinct edges can never collide and re-creating the same connection
 * is idempotent.
 */
export function createEdgeId(
  source: string,
  sourceHandle: string | null | undefined,
  target: string,
  targetHandle: string | null | undefined
): string {
  return `${source}-${sourceHandle}-${target}-${targetHandle}`;
}
