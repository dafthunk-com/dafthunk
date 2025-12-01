import { describe, expect, it } from "vitest";

import { speechToTextTemplate } from "./speech-to-text";

describe("Speech to Text Template", () => {
  it("should have valid structure", () => {
    expect(speechToTextTemplate.nodes).toHaveLength(3);
    expect(speechToTextTemplate.edges).toHaveLength(2);

    const nodeIds = new Set(speechToTextTemplate.nodes.map((n) => n.id));
    for (const edge of speechToTextTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(speechToTextTemplate.id).toBe("speech-to-text");
    expect(speechToTextTemplate.name).toBe("Speech to Text");
    expect(speechToTextTemplate.type).toBe("manual");
    expect(speechToTextTemplate.tags).toContain("audio");
    expect(speechToTextTemplate.tags).toContain("stt");
  });

  it("should have correct node configuration", () => {
    const recorderNode = speechToTextTemplate.nodes.find(
      (n) => n.id === "audio-recorder"
    );
    expect(recorderNode).toBeDefined();
    expect(recorderNode?.type).toBe("audio-recorder-input");

    const transcriberNode = speechToTextTemplate.nodes.find(
      (n) => n.id === "transcriber"
    );
    expect(transcriberNode).toBeDefined();
    expect(transcriberNode?.type).toBe("whisper");

    const previewNode = speechToTextTemplate.nodes.find(
      (n) => n.id === "transcription-preview"
    );
    expect(previewNode).toBeDefined();
    expect(previewNode?.type).toBe("output-text");
  });

  it("should have correct edge connections", () => {
    const edges = speechToTextTemplate.edges;

    const recorderToTranscriber = edges.find(
      (e) => e.source === "audio-recorder" && e.target === "transcriber"
    );
    expect(recorderToTranscriber).toBeDefined();
    expect(recorderToTranscriber?.sourceOutput).toBe("audio");
    expect(recorderToTranscriber?.targetInput).toBe("audio");

    const transcriberToPreview = edges.find(
      (e) => e.source === "transcriber" && e.target === "transcription-preview"
    );
    expect(transcriberToPreview).toBeDefined();
    expect(transcriberToPreview?.sourceOutput).toBe("text");
    expect(transcriberToPreview?.targetInput).toBe("value");
  });
});
