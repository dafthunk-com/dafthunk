import type { Parameter } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { TextInputNode } from "../nodes/input/text-input-node";
import { NumberPreviewNode } from "../nodes/preview/number-preview-node";
import { DistilbertSst2Int8Node } from "../nodes/text/distilbert-sst-2-int8-node";
import { textSentimentAnalysisTemplate } from "./text-sentiment-analysis";

describe("Text Sentiment Analysis Template", () => {
  it("should have correct node types defined", () => {
    expect(textSentimentAnalysisTemplate.nodes).toHaveLength(4);
    expect(textSentimentAnalysisTemplate.edges).toHaveLength(3);

    const nodeTypes = textSentimentAnalysisTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-input");
    expect(nodeTypes).toContain("distilbert-sst-2-int8");
    expect(nodeTypes).toContain("preview-number");
  });

  it("should execute all nodes in the template", async () => {
    // Execute text area input node
    const inputNode = textSentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "input-1"
    )!;
    const inputInstance = new TextInputNode({
      ...inputNode,
      inputs: inputNode.inputs.map((input) =>
        input.name === "value"
          ? { ...input, value: "I love this product!" }
          : input
      ) as Parameter[],
    });
    const inputResult = await inputInstance.execute({
      nodeId: inputNode.id,
      inputs: { value: "I love this product!" },
      env: env as Bindings,
    } as any);
    expect(inputResult.status).toBe("completed");
    expect(inputResult.outputs?.value).toBe("I love this product!");

    // Execute sentiment analysis node
    const analyzerNode = textSentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "analyzer-1"
    )!;
    const analyzerInstance = new DistilbertSst2Int8Node(analyzerNode);
    const analyzerResult = await analyzerInstance.execute({
      nodeId: analyzerNode.id,
      inputs: {
        text: inputResult.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(analyzerResult.status).toBe("completed");
    expect(analyzerResult.outputs?.positive).toBeDefined();
    expect(analyzerResult.outputs?.negative).toBeDefined();
    expect(typeof analyzerResult.outputs?.positive).toBe("number");
    expect(typeof analyzerResult.outputs?.negative).toBe("number");

    // Execute positive preview node
    const positivePreviewNode = textSentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "preview-positive"
    )!;
    const positivePreviewInstance = new NumberPreviewNode(positivePreviewNode);
    const positivePreviewResult = await positivePreviewInstance.execute({
      nodeId: positivePreviewNode.id,
      inputs: {
        value: analyzerResult.outputs?.positive,
      },
      env: env as Bindings,
    } as any);
    expect(positivePreviewResult.status).toBe("completed");
    expect(positivePreviewResult.outputs?.displayValue).toBeDefined();

    // Execute negative preview node
    const negativePreviewNode = textSentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "preview-negative"
    )!;
    const negativePreviewInstance = new NumberPreviewNode(negativePreviewNode);
    const negativePreviewResult = await negativePreviewInstance.execute({
      nodeId: negativePreviewNode.id,
      inputs: {
        value: analyzerResult.outputs?.negative,
      },
      env: env as Bindings,
    } as any);
    expect(negativePreviewResult.status).toBe("completed");
    expect(negativePreviewResult.outputs?.displayValue).toBeDefined();
  });
});
