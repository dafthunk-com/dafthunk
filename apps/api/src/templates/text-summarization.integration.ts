import type { Parameter } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { BartLargeCnnNode } from "../nodes/text/bart-large-cnn-node";
import { TextAreaNode } from "../nodes/text/text-area-node";
import { textSummarizationTemplate } from "./text-summarization";

describe("Text Summarization Template", () => {
  it("should have correct node types defined", () => {
    expect(textSummarizationTemplate.nodes).toHaveLength(2);
    expect(textSummarizationTemplate.edges).toHaveLength(1);

    const nodeTypes = textSummarizationTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-area");
    expect(nodeTypes).toContain("bart-large-cnn");
  });

  it("should execute all nodes in the template", async () => {
    const inputText =
      "Paris is the capital and most populous city of France. With an official estimated population of 2,102,650 residents as of 1 January 2023 in an area of more than 105 km², Paris is the fourth-most populated city in the European Union and the 30th most densely populated city in the world in 2022. Since the 17th century, Paris has been one of the world's major centres of finance, diplomacy, commerce, culture, fashion, gastronomy and many areas.";

    // Execute text area input node
    const inputNode = textSummarizationTemplate.nodes.find(
      (n) => n.id === "input-1"
    )!;
    const inputInstance = new TextAreaNode({
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
  });
});
