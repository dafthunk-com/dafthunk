import { env } from "cloudflare:test";
import { CloudflareModelNode } from "@dafthunk/runtime/nodes/cloudflare/cloudflare-model-node";
import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import type { Parameter } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import type { Bindings } from "../context";
import { textTranslationTemplate } from "./text-translation";

describe("Text Translation Template", () => {
  it("should have correct node types defined", () => {
    expect(textTranslationTemplate.nodes).toHaveLength(5);
    expect(textTranslationTemplate.edges).toHaveLength(4);

    const nodeTypes = textTranslationTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-input");
    expect(nodeTypes).toContain("cloudflare-model");
    expect(nodeTypes).toContain("output-text");
  });

  it("should execute all nodes in the template", async () => {
    const inputText = "Hello, how are you?";
    const sourceLang = "en";
    const targetLang = "es";

    // Execute text input node
    const inputTextNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "text-to-translate"
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
      (n) => n.id === "source-language"
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
      (n) => n.id === "target-language"
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
      (n) => n.id === "text-translator"
    )!;
    const translatorInstance = new CloudflareModelNode(translatorNode);
    const translatorResult = await translatorInstance.execute({
      nodeId: translatorNode.id,
      inputs: {
        model: "@cf/meta/m2m100-1.2b",
        text: inputTextResult.outputs?.value,
        source_lang: sourceLangResult.outputs?.value,
        target_lang: targetLangResult.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(translatorResult.status).toBe("completed");
    expect(translatorResult.outputs?.translated_text).toBeDefined();
    expect(typeof translatorResult.outputs?.translated_text).toBe("string");
    expect(
      (translatorResult.outputs?.translated_text as string).length
    ).toBeGreaterThan(0);

    // Execute output node
    const outputNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "translation-preview"
    )!;
    const outputInstance = new TextOutputNode(outputNode);
    const outputResult = await outputInstance.execute({
      nodeId: outputNode.id,
      inputs: {
        value: translatorResult.outputs?.translated_text,
      },
      env: env as Bindings,
    } as any);
    expect(outputResult.status).toBe("completed");
    expect(outputResult.outputs?.displayValue).toBeDefined();
  });
});
