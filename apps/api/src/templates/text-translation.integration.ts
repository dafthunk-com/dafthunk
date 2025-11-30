import type { Parameter } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { TextInputNode } from "../nodes/input/text-input-node";
import { TextPreviewNode } from "../nodes/preview/text-preview-node";
import { M2m10012bNode } from "../nodes/text/m2m100-1-2b-node";
import { textTranslationTemplate } from "./text-translation";

describe("Text Translation Template", () => {
  it("should have correct node types defined", () => {
    expect(textTranslationTemplate.nodes).toHaveLength(5);
    expect(textTranslationTemplate.edges).toHaveLength(4);

    const nodeTypes = textTranslationTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-input");
    expect(nodeTypes).toContain("m2m100-1-2b");
    expect(nodeTypes).toContain("preview-text");
  });

  it("should execute all nodes in the template", async () => {
    const inputText = "Hello, how are you?";
    const sourceLang = "en";
    const targetLang = "es";

    // Execute text input node
    const inputTextNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "input-text"
    )!;
    const inputTextInstance = new TextInputNode({
      ...inputTextNode,
      inputs: inputTextNode.inputs.map((input) =>
        input.name === "value" ? { ...input, value: inputText } : input
      ) as Parameter[],
    });
    const inputTextResult = await inputTextInstance.execute({
      nodeId: inputTextNode.id,
      inputs: { value: inputText },
      env: env as Bindings,
    } as any);
    expect(inputTextResult.status).toBe("completed");
    expect(inputTextResult.outputs?.value).toBe(inputText);

    // Execute source language input node
    const sourceLangNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "input-source-lang"
    )!;
    const sourceLangInstance = new TextInputNode({
      ...sourceLangNode,
      inputs: sourceLangNode.inputs.map((input) =>
        input.name === "value" ? { ...input, value: sourceLang } : input
      ) as Parameter[],
    });
    const sourceLangResult = await sourceLangInstance.execute({
      nodeId: sourceLangNode.id,
      inputs: { value: sourceLang },
      env: env as Bindings,
    } as any);
    expect(sourceLangResult.status).toBe("completed");
    expect(sourceLangResult.outputs?.value).toBe(sourceLang);

    // Execute target language input node
    const targetLangNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "input-target-lang"
    )!;
    const targetLangInstance = new TextInputNode({
      ...targetLangNode,
      inputs: targetLangNode.inputs.map((input) =>
        input.name === "value" ? { ...input, value: targetLang } : input
      ) as Parameter[],
    });
    const targetLangResult = await targetLangInstance.execute({
      nodeId: targetLangNode.id,
      inputs: { value: targetLang },
      env: env as Bindings,
    } as any);
    expect(targetLangResult.status).toBe("completed");
    expect(targetLangResult.outputs?.value).toBe(targetLang);

    // Execute translation node
    const translatorNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "translator-1"
    )!;
    const translatorInstance = new M2m10012bNode(translatorNode);
    const translatorResult = await translatorInstance.execute({
      nodeId: translatorNode.id,
      inputs: {
        text: inputTextResult.outputs?.value,
        sourceLang: sourceLangResult.outputs?.value,
        targetLang: targetLangResult.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(translatorResult.status).toBe("completed");
    expect(translatorResult.outputs?.translatedText).toBeDefined();
    expect(typeof translatorResult.outputs?.translatedText).toBe("string");
    expect(translatorResult.outputs?.translatedText.length).toBeGreaterThan(0);

    // Execute preview node
    const previewNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "preview-1"
    )!;
    const previewInstance = new TextPreviewNode(previewNode);
    const previewResult = await previewInstance.execute({
      nodeId: previewNode.id,
      inputs: {
        value: translatorResult.outputs?.translatedText,
      },
      env: env as Bindings,
    } as any);
    expect(previewResult.status).toBe("completed");
    expect(previewResult.outputs?.displayValue).toBeDefined();
  });
});
