import type { WorkflowTemplate } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

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
    it("has unique node ids", () => {
      const ids = t.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("has edges that reference existing nodes", () => {
      const nodeIds = new Set(t.nodes.map((n) => n.id));
      for (const e of t.edges) {
        expect(nodeIds.has(e.source), `${e.source} not a node`).toBe(true);
        expect(nodeIds.has(e.target), `${e.target} not a node`).toBe(true);
      }
    });

    it("each edge wires to a valid output and input", () => {
      for (const e of t.edges) {
        const source = t.nodes.find((n) => n.id === e.source);
        const target = t.nodes.find((n) => n.id === e.target);
        expect(
          source?.outputs.some((o) => o.name === e.sourceOutput),
          `${e.source}.${e.sourceOutput} (has: ${source?.outputs.map((o) => o.name).join(", ")})`
        ).toBe(true);
        expect(
          target?.inputs.some((i) => i.name === e.targetInput),
          `${e.target}.${e.targetInput} (has: ${target?.inputs.map((i) => i.name).join(", ")})`
        ).toBe(true);
      }
    });
  });
}
