import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testAudioData } from "../../../test/fixtures/audio-fixtures";
import { NodeContext } from "../../runtime/node-types";
import { Nova3Node } from "./nova-3-node";

describe("Nova3Node", () => {
  it("should execute successfully with basic parameters", async () => {
    const nodeId = "nova-3";
    const node = new Nova3Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        audio: testAudioData,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.text).toBeDefined();
    expect(typeof result.outputs?.text).toBe("string");
    expect(result.outputs?.confidence).toBeDefined();
    expect(typeof result.outputs?.confidence).toBe("number");
    expect(result.outputs?.words).toBeDefined();
    expect(Array.isArray(result.outputs?.words)).toBe(true);
  });

  it("should execute successfully with language detection enabled", async () => {
    const nodeId = "nova-3";
    const node = new Nova3Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        audio: testAudioData,
        detect_language: true,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.text).toBeDefined();
    expect(typeof result.outputs?.text).toBe("string");
    expect(result.outputs?.confidence).toBeDefined();
    expect(typeof result.outputs?.confidence).toBe("number");
    expect(result.outputs?.words).toBeDefined();
    expect(Array.isArray(result.outputs?.words)).toBe(true);
    if (result.outputs?.language) {
      expect(typeof result.outputs.language).toBe("string");
    }
  });

  it("should return error when audio is not provided", async () => {
    const nodeId = "nova-3";
    const node = new Nova3Node({
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
    expect(result.error).toContain("Audio input is required");
  });

  it("should return error when AI service is not available", async () => {
    const nodeId = "nova-3";
    const node = new Nova3Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        audio: testAudioData,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("AI service is not available");
  });
});
