import { env } from "cloudflare:test";
import { CloudflareModelNode } from "@dafthunk/runtime/nodes/cloudflare/cloudflare-model-node";
import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { VarStringTemplateNode } from "@dafthunk/runtime/nodes/text/var-string-template-node";
import type { Parameter } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import type { Bindings } from "../context";
import { textSummarizationTemplate } from "./text-summarization";

describe("Text Summarization Template", () => {
  it("should have correct node types defined", () => {
    expect(textSummarizationTemplate.nodes).toHaveLength(4);
    expect(textSummarizationTemplate.edges).toHaveLength(3);

    const nodeTypes = textSummarizationTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-input");
    expect(nodeTypes).toContain("var-string-template");
    expect(nodeTypes).toContain("cloudflare-model");
    expect(nodeTypes).toContain("output-text");
  });

  it("should pin a model that is still served by Workers AI", () => {
    const summarizerNode = textSummarizationTemplate.nodes.find(
      (n) => n.id === "text-summarizer"
    )!;
    const modelInput = summarizerNode.inputs.find((i) => i.name === "model");
    // Retired 2026-05-30 along with the whole Summarization task.
    expect(modelInput?.value).not.toBe("@cf/facebook/bart-large-cnn");
  });

  it("should execute all nodes in the template", async () => {
    const inputText =
      "Paris is the capital and most populous city of France. With an official estimated population of 2,102,650 residents as of 1 January 2023 in an area of more than 105 km², Paris is the fourth-most populated city in the European Union and the 30th most densely populated city in the world in 2022. Since the 17th century, Paris has been one of the world's major centres of finance, diplomacy, commerce, culture, fashion, gastronomy and many areas.";

    // Execute text input node
    const inputNode = textSummarizationTemplate.nodes.find(
      (n) => n.id === "text-to-summarize"
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
    expect(inputResult.status, String(inputResult.error)).toBe("completed");
    expect(inputResult.outputs?.value).toBe(inputText);

    // Build the summarization prompt around the input text
    const promptNode = textSummarizationTemplate.nodes.find(
      (n) => n.id === "summary-prompt"
    )!;
    const promptInstance = new VarStringTemplateNode(promptNode);
    const promptResult = await promptInstance.execute({
      nodeId: promptNode.id,
      inputs: {
        template: promptNode.inputs.find((i) => i.name === "template")?.value,
        var_1: inputResult.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(promptResult.status, String(promptResult.error)).toBe("completed");
    expect(promptResult.outputs?.missingVariables).toEqual([]);
    expect(promptResult.outputs?.result).toContain(inputText);

    // Execute summarizer node
    const summarizerNode = textSummarizationTemplate.nodes.find(
      (n) => n.id === "text-summarizer"
    )!;
    const summarizerInstance = new CloudflareModelNode(summarizerNode);
    const summarizerResult = await summarizerInstance.execute({
      nodeId: summarizerNode.id,
      inputs: {
        model: summarizerNode.inputs.find((i) => i.name === "model")?.value,
        prompt: promptResult.outputs?.result,
        max_tokens: 256,
      },
      env: env as Bindings,
    } as any);
    expect(summarizerResult.status, String(summarizerResult.error)).toBe(
      "completed"
    );
    expect(summarizerResult.outputs?.response).toBeDefined();
    expect(typeof summarizerResult.outputs?.response).toBe("string");
    const summary = (summarizerResult.outputs?.response as string).trim();
    expect(summary.length).toBeGreaterThan(0);
    // Deliberately no assertion that the summary is shorter than the input.
    // bart-large-cnn was a dedicated summarizer and always compressed; a
    // general instruct model sometimes expands instead, so length is not a
    // property this test can hold the model to without becoming flaky.
    expect(summary).not.toBe(inputText);

    // Execute output node
    const outputNode = textSummarizationTemplate.nodes.find(
      (n) => n.id === "summary-preview"
    )!;
    const outputInstance = new TextOutputNode(outputNode);
    const outputResult = await outputInstance.execute({
      nodeId: outputNode.id,
      inputs: {
        value: summarizerResult.outputs?.response,
      },
      env: env as Bindings,
    } as any);
    expect(outputResult.status, String(outputResult.error)).toBe("completed");
    expect(outputResult.outputs?.displayValue).toBeDefined();
  });
});
