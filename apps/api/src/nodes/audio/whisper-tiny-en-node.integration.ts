import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testAudioData } from "../../../test/fixtures/audio-fixtures";
import { NodeContext } from "@dafthunk/runtime";
import { WhisperTinyEnNode } from "./whisper-tiny-en-node";

describe("WhisperTinyEnNode", () => {
  it("should execute manually", async () => {
    const nodeId = "whisper-tiny-en";
    const node = new WhisperTinyEnNode({
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
    expect(result.outputs?.word_count).toBeDefined();
    expect(typeof result.outputs?.word_count).toBe("number");
    // words is optional according to Cloudflare types, so just check if it exists
    expect(result.outputs?.words).toBeDefined();
    expect(result.outputs?.vtt).toBeDefined();
    expect(typeof result.outputs?.vtt).toBe("string");
  });

  it("should return error when AI service is not available", async () => {
    const nodeId = "whisper-tiny-en";
    const node = new WhisperTinyEnNode({
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
