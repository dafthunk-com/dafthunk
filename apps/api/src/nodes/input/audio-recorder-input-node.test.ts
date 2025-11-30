import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testAudioData } from "../../../test/fixtures/audio-fixtures";
import type { NodeContext } from "../types";
import { AudioRecorderInputNode } from "./audio-recorder-input-node";

describe("AudioRecorderInputNode", () => {
  it("should execute with valid audio input", async () => {
    const nodeId = "audio-recorder";
    const node = new AudioRecorderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: testAudioData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.audio).toBeDefined();
    expect(result.outputs?.audio.data).toEqual(testAudioData.data);
    expect(result.outputs?.audio.mimeType).toBe(testAudioData.mimeType);
  });

  it("should return error for missing audio input", async () => {
    const nodeId = "audio-recorder";
    const node = new AudioRecorderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No audio data provided");
  });

  it("should return error for null audio input", async () => {
    const nodeId = "audio-recorder";
    const node = new AudioRecorderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No audio data provided");
  });

  it("should return error for undefined audio input", async () => {
    const nodeId = "audio-recorder";
    const node = new AudioRecorderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No audio data provided");
  });
});
