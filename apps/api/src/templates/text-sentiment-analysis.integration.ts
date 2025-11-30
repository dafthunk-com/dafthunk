import type { Parameter } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { DistilbertSst2Int8Node } from "../nodes/text/distilbert-sst-2-int8-node";
import { TextAreaNode } from "../nodes/text/text-area-node";
import { textSentimentAnalysisTemplate } from "./text-sentiment-analysis";

describe("Text Sentiment Analysis Template", () => {
  it("should have correct node types defined", () => {
    expect(textSentimentAnalysisTemplate.nodes).toHaveLength(2);
    expect(textSentimentAnalysisTemplate.edges).toHaveLength(1);

    const nodeTypes = textSentimentAnalysisTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-area");
    expect(nodeTypes).toContain("distilbert-sst-2-int8");
  });

  it("should execute all nodes in the template", async () => {
    // Execute text area input node
    const inputNode = textSentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "input-1"
    )!;
    const inputInstance = new TextAreaNode({
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
  });
});
