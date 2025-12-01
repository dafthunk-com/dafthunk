import type { Parameter } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { TextInputNode } from "../nodes/input/text-input-node";
import { TextOutputNode } from "../nodes/output/text-output-node";
import { BartLargeCnnNode } from "../nodes/text/bart-large-cnn-node";
import { textSummarizationTemplate } from "./text-summarization";

describe("Text Summarization Template", () => {
  it("should have correct node types defined", () => {
    expect(textSummarizationTemplate.nodes).toHaveLength(3);
    expect(textSummarizationTemplate.edges).toHaveLength(2);

    const nodeTypes = textSummarizationTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-input");
    expect(nodeTypes).toContain("bart-large-cnn");
    expect(nodeTypes).toContain("output-text");
  });

  it("should execute all nodes in the template", async () => {
    const inputText =
      "Paris is the capital and most populous city of France. With an official estimated population of 2,102,650 residents as of 1 January 2023 in an area of more than 105 km², Paris is the fourth-most populated city in the European Union and the 30th most densely populated city in the world in 2022. Since the 17th century, Paris has been one of the world's major centres of finance, diplomacy, commerce, culture, fashion, gastronomy and many areas.";

    // Execute text area input node
    const inputNode = textSummarizationTemplate.nodes.find(
      (n) => n.id === "input-1"
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

    // Execute summarizer node
    const summarizerNode = textSummarizationTemplate.nodes.find(
      (n) => n.id === "summarizer-1"
    )!;
    const summarizerInstance = new BartLargeCnnNode(summarizerNode);
    const summarizerResult = await summarizerInstance.execute({
      nodeId: summarizerNode.id,
      inputs: {
        inputText: inputResult.outputs?.value,
        maxLength: 1024,
      },
      env: env as Bindings,
    } as any);
    expect(summarizerResult.status).toBe("completed");
    expect(summarizerResult.outputs?.summary).toBeDefined();
    expect(typeof summarizerResult.outputs?.summary).toBe("string");
    expect(summarizerResult.outputs?.summary.length).toBeLessThan(
      inputText.length
    );

    // Execute preview node
    const previewNode = textSummarizationTemplate.nodes.find(
      (n) => n.id === "output-1"
    )!;
    const previewInstance = new TextOutputNode(previewNode);
    const previewResult = await previewInstance.execute({
      nodeId: previewNode.id,
      inputs: {
        value: summarizerResult.outputs?.summary,
      },
      env: env as Bindings,
    } as any);
    expect(previewResult.status).toBe("completed");
    expect(previewResult.outputs?.displayValue).toBeDefined();
  });
});
