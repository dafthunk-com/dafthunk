import { env } from "cloudflare:test";
import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { M2m10012bNode } from "./m2m100-1-2b-node";

describe("M2m10012bNode", () => {
  it("should execute translation from English to Spanish", async () => {
    const nodeId = "m2m100-1-2b";
    const node = new M2m10012bNode({
      nodeId,
    } as unknown as Node);

    const text = "Hello, how are you?";
    const context = {
      nodeId,
      inputs: {
        text,
        sourceLang: "en",
        targetLang: "es",
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.translatedText).toBeDefined();
    expect(typeof result.outputs?.translatedText).toBe("string");
    expect(result.outputs?.translatedText.length).toBeGreaterThan(0);
  });

  it("should execute translation from Spanish to English", async () => {
    const nodeId = "m2m100-1-2b";
    const node = new M2m10012bNode({
      nodeId,
    } as unknown as Node);

    const text = "Hola, ¿cómo estás?";
    const context = {
      nodeId,
      inputs: {
        text,
        sourceLang: "es",
        targetLang: "en",
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.translatedText).toBeDefined();
    expect(typeof result.outputs?.translatedText).toBe("string");
    expect(result.outputs?.translatedText.length).toBeGreaterThan(0);
  });
});
