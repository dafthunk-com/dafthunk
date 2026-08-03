import type { Edge, Node, WorkflowTemplate } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

/**
 * Structural problems in a graph: duplicate ids, dangling edge endpoints, and
 * edges naming ports that do not exist. Returns human-readable strings so both
 * the template tests and the generator benchmark can report the same failures.
 */
export function findStructuralProblems(nodes: Node[], edges: Edge[]): string[] {
  const problems: string[] = [];

  const ids = nodes.map((n) => n.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicates)) {
    problems.push(`duplicate node id "${id}"`);
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);

    if (!source) {
      problems.push(`edge source "${edge.source}" is not a node`);
    }
    if (!target) {
      problems.push(`edge target "${edge.target}" is not a node`);
    }
    if (!source || !target) continue;

    if (!source.outputs.some((o) => o.name === edge.sourceOutput)) {
      problems.push(
        `${edge.source}.${edge.sourceOutput} is not an output (has: ${source.outputs.map((o) => o.name).join(", ")})`
      );
    }
    if (!target.inputs.some((i) => i.name === edge.targetInput)) {
      problems.push(
        `${edge.target}.${edge.targetInput} is not an input (has: ${target.inputs.map((i) => i.name).join(", ")})`
      );
    }
  }

  return problems;
}

/**
 * Standard structural checks for a WorkflowTemplate: unique node ids,
 * edges that reference existing nodes, and edges that target valid
 * input/output names. Call once per template test file.
 */
export function describeTemplateStructure(
  name: string,
  t: WorkflowTemplate
): void {
  describe(`${name} structure`, () => {
    it("is structurally sound", () => {
      expect(findStructuralProblems(t.nodes, t.edges)).toEqual([]);
    });
  });
}
