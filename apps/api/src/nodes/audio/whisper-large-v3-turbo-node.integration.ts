import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testAudioData } from "../../../test/fixtures/audio-fixtures";
import { NodeContext } from "../types";
import { WhisperLargeV3TurboNode } from "./whisper-large-v3-turbo-node";

describe("WhisperLargeV3TurboNode", () => {
  it("should execute manually with basic parameters", async () => {
    const nodeId = "whisper-large-v3-turbo";
    const node = new WhisperLargeV3TurboNode({
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
    expect(result.outputs?.segments).toBeDefined();
    // segments might be undefined, so check if it's an array when it exists
    if (result.outputs?.segments !== undefined) {
      expect(Array.isArray(result.outputs.segments)).toBe(true);
    }
    expect(result.outputs?.vtt).toBeDefined();
    expect(typeof result.outputs?.vtt).toBe("string");
    expect(result.outputs?.transcription_info).toBeDefined();
    expect(typeof result.outputs?.transcription_info).toBe("object");
  });

  it("should execute with all optional parameters", async () => {
    const nodeId = "whisper-large-v3-turbo";
    const node = new WhisperLargeV3TurboNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        audio: testAudioData,
        task: "transcribe",
        language: "en",
        vad_filter: true,
        initial_prompt: "This is a test audio file",
        prefix: "Test:",
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
    expect(result.outputs?.segments).toBeDefined();
    // segments might be undefined, so check if it's an array when it exists
    if (result.outputs?.segments !== undefined) {
      expect(Array.isArray(result.outputs.segments)).toBe(true);
    }
    expect(result.outputs?.vtt).toBeDefined();
    expect(typeof result.outputs?.vtt).toBe("string");
    expect(result.outputs?.transcription_info).toBeDefined();
    expect(typeof result.outputs?.transcription_info).toBe("object");
  });

  it("should return error when AI service is not available", async () => {
    const nodeId = "whisper-large-v3-turbo";
    const node = new WhisperLargeV3TurboNode({
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
