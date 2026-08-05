import type { Workflow } from "@dafthunk/types";

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
