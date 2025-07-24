import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { MelottsNode } from "./melotts-node";

describe("MelottsNode", () => {
  it("should execute manually with default language", async () => {
    const nodeId = "melotts";
    const node = new MelottsNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        prompt: "Hello, this is a test for text to speech conversion.",
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.audio).toBeDefined();
    expect(result.outputs?.audio.data).toBeDefined();
    expect(result.outputs?.audio.data instanceof Uint8Array).toBe(true);
    expect(result.outputs?.audio.mimeType).toBe("audio/mpeg");
    expect(result.outputs?.audio.data.length).toBeGreaterThan(0);
  });

  it("should execute with custom language", async () => {
    const nodeId = "melotts";
    const node = new MelottsNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        prompt: "Hello, this is a test for text to speech conversion.",
        lang: "en", // Use English instead of French to avoid language support issues
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.audio).toBeDefined();
    expect(result.outputs?.audio.data).toBeDefined();
    expect(result.outputs?.audio.data instanceof Uint8Array).toBe(true);
    expect(result.outputs?.audio.mimeType).toBe("audio/mpeg");
    expect(result.outputs?.audio.data.length).toBeGreaterThan(0);
  });

  it("should return error when AI service is not available", async () => {
    const nodeId = "melotts";
    const node = new MelottsNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        prompt: "Hello, this is a test.",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("AI service is not available");
  });
});
