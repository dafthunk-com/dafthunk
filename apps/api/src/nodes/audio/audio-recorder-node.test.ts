import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testAudioData } from "../../../test/fixtures/audio-fixtures";
import { NodeContext } from "../types";
import { AudioRecorderNode } from "./audio-recorder-node";

describe("AudioRecorderNode", () => {
  it("should execute with valid audio input", async () => {
    const nodeId = "audio-recorder";
    const node = new AudioRecorderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: testAudioData,
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
    const node = new AudioRecorderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No audio data provided");
  });

  it("should return error for null audio input", async () => {
    const nodeId = "audio-recorder";
    const node = new AudioRecorderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: null,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No audio data provided");
  });

  it("should return error for undefined audio input", async () => {
    const nodeId = "audio-recorder";
    const node = new AudioRecorderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: undefined,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No audio data provided");
  });
});
