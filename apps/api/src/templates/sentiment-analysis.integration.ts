import { env } from "cloudflare:test";
import { CloudflareModelNode } from "@dafthunk/runtime/nodes/cloudflare/cloudflare-model-node";
import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { JsonOutputNode } from "@dafthunk/runtime/nodes/output/json-output-node";
import type { Parameter } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import type { Bindings } from "../context";
import { sentimentAnalysisTemplate } from "./sentiment-analysis";

describe("Sentiment Analysis Template", () => {
  it("should have correct node types defined", () => {
    expect(sentimentAnalysisTemplate.nodes).toHaveLength(3);
    expect(sentimentAnalysisTemplate.edges).toHaveLength(2);

    const nodeTypes = sentimentAnalysisTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-input");
    expect(nodeTypes).toContain("cloudflare-model");
    expect(nodeTypes).toContain("output-json");
  });

  it("should execute all nodes in the template", async () => {
    const inputText =
      "I absolutely loved this product! It exceeded all my expectations.";

    // Execute text input node
    const inputNode = sentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "text-to-analyze"
    )!;
    const inputInstance = new TextInputNode({
      ...inputNode,
      inputs: inputNode.inputs.map((input) =>
        input.name === "value" ? { ...input, value: inputText } : input
      ) as Parameter[],
    });
    const inputResult = await inputInstance.execute({
      nodeId: inputNode.id,
      inputs: { value: inputText },
      env: env as Bindings,
    } as any);
    expect(inputResult.status).toBe("completed");
    expect(inputResult.outputs?.value).toBe(inputText);

    // Execute sentiment analyzer node
    const analyzerNode = sentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "sentiment-analyzer"
    )!;
    const analyzerInstance = new CloudflareModelNode(analyzerNode);
    const analyzerResult = await analyzerInstance.execute({
      nodeId: analyzerNode.id,
      inputs: {
        model: "@cf/huggingface/distilbert-sst-2-int8",
        text: inputResult.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(analyzerResult.status).toBe("completed");
    const classifications = analyzerResult.outputs?.output as
      | Array<{ label: string; score: number }>
      | undefined;
    expect(Array.isArray(classifications)).toBe(true);
    expect(classifications!.length).toBeGreaterThan(0);
    for (const entry of classifications!) {
      expect(typeof entry.label).toBe("string");
      expect(typeof entry.score).toBe("number");
    }

    // Execute output node
    const outputNode = sentimentAnalysisTemplate.nodes.find(
      (n) => n.id === "sentiment-preview"
    )!;
    const outputInstance = new JsonOutputNode(outputNode);
    const outputResult = await outputInstance.execute({
      nodeId: outputNode.id,
      inputs: {
        value: classifications,
      },
      env: env as Bindings,
    } as any);
    expect(outputResult.status).toBe("completed");
    expect(outputResult.outputs?.displayValue).toBeDefined();
  });
});
