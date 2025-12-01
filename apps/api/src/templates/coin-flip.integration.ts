import { describe, expect, it } from "vitest";

import { coinFlipTemplate } from "./coin-flip";

describe("Conditional Branching Template", () => {
  it("should have valid structure", () => {
    expect(coinFlipTemplate.nodes).toHaveLength(7);
    expect(coinFlipTemplate.edges).toHaveLength(7);

    const nodeIds = new Set(coinFlipTemplate.nodes.map((n) => n.id));
    for (const edge of coinFlipTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(coinFlipTemplate.id).toBe("conditional-branching");
    expect(coinFlipTemplate.name).toBe("Conditional Branching");
    expect(coinFlipTemplate.type).toBe("manual");
    expect(coinFlipTemplate.tags).toContain("logic");
  });

  it("should have correct node types", () => {
    const types = coinFlipTemplate.nodes.map((n) => n.type);
    expect(types).toContain("boolean-input");
    expect(types).toContain("number-input");
    expect(types).toContain("conditional-fork");
    expect(types).toContain("addition");
    expect(types).toContain("subtraction");
    expect(types).toContain("conditional-join");
    expect(types).toContain("output-number");
  });

  it("should have correct fork/join connections", () => {
    const edges = coinFlipTemplate.edges;

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
