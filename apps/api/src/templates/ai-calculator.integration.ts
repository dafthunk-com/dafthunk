import { describe, expect, it } from "vitest";

import { aiCalculatorTemplate } from "./ai-calculator";

describe("AI Calculator Template", () => {
  it("should have valid structure", () => {
    expect(aiCalculatorTemplate.nodes).toHaveLength(3);
    expect(aiCalculatorTemplate.edges).toHaveLength(2);

    const nodeIds = new Set(aiCalculatorTemplate.nodes.map((n) => n.id));
    for (const edge of aiCalculatorTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(aiCalculatorTemplate.id).toBe("ai-calculator");
    expect(aiCalculatorTemplate.name).toBe("AI Calculator");
    expect(aiCalculatorTemplate.type).toBe("manual");
    expect(aiCalculatorTemplate.tags).toContain("ai");
    expect(aiCalculatorTemplate.tags).toContain("math");
    expect(aiCalculatorTemplate.tags).toContain("tools");
  });

  it("should have correct node configuration", () => {
    const problemNode = aiCalculatorTemplate.nodes.find(
      (n) => n.id === "problem-input"
    );
    expect(problemNode).toBeDefined();
    expect(problemNode?.type).toBe("text-input");

    const aiNode = aiCalculatorTemplate.nodes.find((n) => n.id === "ai-solver");
    expect(aiNode).toBeDefined();
    expect(aiNode?.type).toBe("llama-3-3-70b-instruct-fp8-fast");

    const previewNode = aiCalculatorTemplate.nodes.find(
      (n) => n.id === "solution-preview"
    );
    expect(previewNode).toBeDefined();
    expect(previewNode?.type).toBe("preview-text");
  });

  it("should have calculator configured as a tool for the AI node", () => {
    const aiNode = aiCalculatorTemplate.nodes.find((n) => n.id === "ai-solver");
    expect(aiNode?.functionCalling).toBe(true);
    const toolsInput = aiNode?.inputs.find((i) => i.name === "tools");
    expect(toolsInput).toBeDefined();
    expect(toolsInput?.value).toEqual([
      { type: "node", identifier: "calculator" },
    ] as unknown);
  });

  it("should have correct edge connections", () => {
    const edges = aiCalculatorTemplate.edges;

    const problemToAi = edges.find(
      (e) => e.source === "problem-input" && e.target === "ai-solver"
    );
    expect(problemToAi).toBeDefined();
    expect(problemToAi?.sourceOutput).toBe("value");
    expect(problemToAi?.targetInput).toBe("prompt");

    const aiToPreview = edges.find(
      (e) => e.source === "ai-solver" && e.target === "solution-preview"
    );
    expect(aiToPreview).toBeDefined();
    expect(aiToPreview?.sourceOutput).toBe("response");
    expect(aiToPreview?.targetInput).toBe("value");
  });
});
