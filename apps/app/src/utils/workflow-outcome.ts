import type { Workflow } from "@dafthunk/types";

/**
 * Nodes with no outgoing edge — the ones whose output is the actual answer.
 *
 * Shared by the developer generate page and the brief flow, which want it for
 * opposite reasons: one renders everything and marks these, the other renders
 * only these and hides the rest.
 */
export function terminalNodeIds(workflow: Workflow): Set<string> {
  const withOutgoing = new Set(workflow.edges.map((edge) => edge.source));
  return new Set(
    workflow.nodes.map((node) => node.id).filter((id) => !withOutgoing.has(id))
  );
}
