import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { Aura1Node } from "./aura-1-node";

describe("Aura1Node", () => {
  it("should execute with default parameters", async () => {
    const nodeId = "aura-1";
    const node = new Aura1Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        text: "Hello, this is a test for text to speech conversion using Aura-1.",
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

  it("should execute with custom speaker", async () => {
    const nodeId = "aura-1";
    const node = new Aura1Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        text: "Hello, this is a test for text to speech conversion using Aura-1.",
        speaker: "athena",
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

  it("should execute with custom audio parameters", async () => {
    const nodeId = "aura-1";
    const node = new Aura1Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        text: "Hello, this is a test for text to speech conversion using Aura-1.",
        speaker: "zeus",
        encoding: "mp3",
        container: "none",
        sample_rate: 24000,
        bit_rate: 128000,
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

  it("should return error when text is not provided", async () => {
    const nodeId = "aura-1";
    const node = new Aura1Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Text input is required");
  });

  it("should return error when AI service is not available", async () => {
    const nodeId = "aura-1";
    const node = new Aura1Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        text: "Hello, this is a test.",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("AI service is not available");
  });
});
