import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { M2m10012bNode } from "../nodes/text/m2m100-1-2b-node";
import { TextAreaNode } from "../nodes/text/text-area-node";

import { textTranslationTemplate } from "./text-translation";

describe("Text Translation Template", () => {
  it("should have correct node types defined", () => {
    expect(textTranslationTemplate.nodes).toHaveLength(2);
    expect(textTranslationTemplate.edges).toHaveLength(1);

    const nodeTypes = textTranslationTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-area");
    expect(nodeTypes).toContain("m2m100-1-2b");
  });

  it("should execute all nodes in the template", async () => {
    const inputText = "Hello, how are you?";

    // Execute text area input node
    const inputNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "text-input-1"
    )!;
    const inputInstance = new TextAreaNode({
      ...inputNode,
      inputs: inputNode.inputs.map((input) =>
        input.name === "value" ? { ...input, value: inputText } : input
      ),
    });
    const inputResult = await inputInstance.execute({
      nodeId: inputNode.id,
      inputs: { value: inputText },
      env: env as Bindings,
    } as any);
    expect(inputResult.status).toBe("completed");
    expect(inputResult.outputs?.value).toBe(inputText);

    // Execute translation node
    const translationNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "translation-1"
    )!;
    const translationInstance = new M2m10012bNode(translationNode);
    const translationResult = await translationInstance.execute({
      nodeId: translationNode.id,
      inputs: {
        text: inputResult.outputs?.value,
        sourceLang: "en",
        targetLang: "es",
      },
      env: env as Bindings,
    } as any);
    expect(translationResult.status).toBe("completed");
    expect(translationResult.outputs?.translatedText).toBeDefined();
    expect(typeof translationResult.outputs?.translatedText).toBe("string");
    expect(translationResult.outputs?.translatedText.length).toBeGreaterThan(0);
  });
});
