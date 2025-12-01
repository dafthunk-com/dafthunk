import { describe, expect, it } from "vitest";

import { sentimentAnalysisTemplate } from "./sentiment-analysis";

describe("Sentiment Analysis Template", () => {
  it("should have valid structure", () => {
    expect(sentimentAnalysisTemplate.nodes).toHaveLength(4);
    expect(sentimentAnalysisTemplate.edges).toHaveLength(3);

    const nodeIds = new Set(sentimentAnalysisTemplate.nodes.map((n) => n.id));
    for (const edge of sentimentAnalysisTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(sentimentAnalysisTemplate.id).toBe("sentiment-analysis");
    expect(sentimentAnalysisTemplate.name).toBe("Sentiment Analysis");
    expect(sentimentAnalysisTemplate.type).toBe("manual");
    expect(sentimentAnalysisTemplate.tags).toContain("sentiment");
    expect(sentimentAnalysisTemplate.tags).toContain("ai");
  });

  it("should have correct node configuration", () => {
    const inputNode = sentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "text-to-analyze"
    );
    expect(inputNode).toBeDefined();
    expect(inputNode?.type).toBe("text-input");

    const analyzerNode = sentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "sentiment-analyzer"
    );
    expect(analyzerNode).toBeDefined();
    expect(analyzerNode?.type).toBe("distilbert-sst-2-int8");

    const positiveOutputNode = sentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "positive-score-preview"
    );
    expect(positiveOutputNode).toBeDefined();
    expect(positiveOutputNode?.type).toBe("output-number");

    const negativeOutputNode = sentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "negative-score-preview"
    );
    expect(negativeOutputNode).toBeDefined();
    expect(negativeOutputNode?.type).toBe("output-number");
  });

  it("should have correct edge connections", () => {
    const edges = sentimentAnalysisTemplate.edges;

    const inputToAnalyzer = edges.find(
      (e) => e.source === "text-to-analyze" && e.target === "sentiment-analyzer"
    );
    expect(inputToAnalyzer).toBeDefined();
    expect(inputToAnalyzer?.sourceOutput).toBe("value");
    expect(inputToAnalyzer?.targetInput).toBe("text");

    const analyzerToPositive = edges.find(
      (e) =>
        e.source === "sentiment-analyzer" &&
        e.target === "positive-score-preview"
    );
    expect(analyzerToPositive).toBeDefined();
    expect(analyzerToPositive?.sourceOutput).toBe("positive");
    expect(analyzerToPositive?.targetInput).toBe("value");

    const analyzerToNegative = edges.find(
      (e) =>
        e.source === "sentiment-analyzer" &&
        e.target === "negative-score-preview"
    );
    expect(analyzerToNegative).toBeDefined();
    expect(analyzerToNegative?.sourceOutput).toBe("negative");
    expect(analyzerToNegative?.targetInput).toBe("value");
  });
});
