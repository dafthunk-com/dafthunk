import type { Workflow } from "@dafthunk/types";

/**
 * Computes a deterministic SHA-1 hash of a workflow definition.
 * Used to group executions that ran the same logical workflow version.
 *
 * Stability guarantees:
 * - Node order does not affect the hash (sorted by id)
 * - Edge order does not affect the hash (sorted by source+target)
 * - Only semantically meaningful fields are included
 */
export async function computeDefinitionHash(
  workflow: Workflow
): Promise<string> {
  const canonical = {
    trigger: workflow.trigger,
    runtime: workflow.runtime,
    nodes: [...workflow.nodes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((node) => ({
        id: node.id,
        type: node.type,
        inputs: node.inputs,
        outputs: node.outputs,
        functionCalling: node.functionCalling,
      })),
    edges: [...workflow.edges].sort((a, b) => {
      const sourceCompare = a.source.localeCompare(b.source);
      if (sourceCompare !== 0) return sourceCompare;
      const targetCompare = a.target.localeCompare(b.target);
      if (targetCompare !== 0) return targetCompare;
      const sourceOutputCompare = a.sourceOutput.localeCompare(b.sourceOutput);
      if (sourceOutputCompare !== 0) return sourceOutputCompare;
      return a.targetInput.localeCompare(b.targetInput);
    }),
  };

  const json = JSON.stringify(canonical);
  const buffer = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
