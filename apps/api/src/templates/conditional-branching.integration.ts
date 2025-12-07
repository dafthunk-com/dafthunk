import { describe, expect, it } from "vitest";

import { conditionalBranchingTemplate } from "./conditional-branching";

describe("Conditional Branching Template", () => {
  it("should have valid structure", () => {
    expect(conditionalBranchingTemplate.nodes).toHaveLength(7);
    expect(conditionalBranchingTemplate.edges).toHaveLength(7);

    const nodeIds = new Set(
      conditionalBranchingTemplate.nodes.map((n) => n.id)
    );
    for (const edge of conditionalBranchingTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(conditionalBranchingTemplate.id).toBe("conditional-branching");
    expect(conditionalBranchingTemplate.name).toBe("Conditional Branching");
    expect(conditionalBranchingTemplate.type).toBe("manual");
    expect(conditionalBranchingTemplate.tags).toContain("logic");
  });

  it("should have correct node types", () => {
    const types = conditionalBranchingTemplate.nodes.map((n) => n.type);
    expect(types).toContain("boolean-input");
    expect(types).toContain("number-input");
    expect(types).toContain("conditional-fork");
    expect(types).toContain("addition");
    expect(types).toContain("subtraction");
    expect(types).toContain("conditional-join");
    expect(types).toContain("output-number");
  });

  it("should have correct fork/join connections", () => {
    const edges = conditionalBranchingTemplate.edges;

    const forkToAdd = edges.find(
      (e) => e.source === "fork" && e.target === "add"
    );
    expect(forkToAdd?.sourceOutput).toBe("true");

    const forkToSubtract = edges.find(
      (e) => e.source === "fork" && e.target === "subtract"
    );
    expect(forkToSubtract?.sourceOutput).toBe("false");
  });
});
