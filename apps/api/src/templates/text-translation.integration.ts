import type { Parameter } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { TextInputNode } from "../nodes/input/text-input-node";
import { M2m10012bNode } from "../nodes/text/m2m100-1-2b-node";
import { textTranslationTemplate } from "./text-translation";

describe("Text Translation Template", () => {
  it("should have correct node types defined", () => {
    expect(textTranslationTemplate.nodes).toHaveLength(2);
    expect(textTranslationTemplate.edges).toHaveLength(1);

    const nodeTypes = textTranslationTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-input");
    expect(nodeTypes).toContain("m2m100-1-2b");
  });

  it("should execute all nodes in the template", async () => {
    const inputText = "Hello, how are you?";

    // Execute text area input node
    const inputNode = textTranslationTemplate.nodes.find(
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

    // Execute translation node
    const translatorNode = textTranslationTemplate.nodes.find(
      (n) => n.id === "translator-1"
    )!;
    const translatorInstance = new M2m10012bNode(translatorNode);
    const translatorResult = await translatorInstance.execute({
      nodeId: translatorNode.id,
      inputs: {
        text: inputResult.outputs?.value,
        sourceLang: "en",
        targetLang: "es",
      },
      env: env as Bindings,
    } as any);
    expect(translatorResult.status).toBe("completed");
    expect(translatorResult.outputs?.translatedText).toBeDefined();
    expect(typeof translatorResult.outputs?.translatedText).toBe("string");
    expect(translatorResult.outputs?.translatedText.length).toBeGreaterThan(0);
  });
});
