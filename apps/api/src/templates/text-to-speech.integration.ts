import { describe, expect, it } from "vitest";

import { textToSpeechTemplate } from "./text-to-speech";

describe("Text to Speech Template", () => {
  it("should have valid structure", () => {
    expect(textToSpeechTemplate.nodes).toHaveLength(3);
    expect(textToSpeechTemplate.edges).toHaveLength(2);

    const nodeIds = new Set(textToSpeechTemplate.nodes.map((n) => n.id));
    for (const edge of textToSpeechTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(textToSpeechTemplate.id).toBe("text-to-speech");
    expect(textToSpeechTemplate.name).toBe("Text to Speech");
    expect(textToSpeechTemplate.type).toBe("manual");
    expect(textToSpeechTemplate.tags).toContain("audio");
    expect(textToSpeechTemplate.tags).toContain("tts");
  });

  it("should have correct node configuration", () => {
    const textNode = textToSpeechTemplate.nodes.find(
      (n) => n.id === "text-to-speak"
    );
    expect(textNode).toBeDefined();
    expect(textNode?.type).toBe("text-input");

    const speechNode = textToSpeechTemplate.nodes.find(
      (n) => n.id === "speech-generator"
    );
    expect(speechNode).toBeDefined();
    expect(speechNode?.type).toBe("melotts");

    const previewNode = textToSpeechTemplate.nodes.find(
      (n) => n.id === "audio-preview"
    );
    expect(previewNode).toBeDefined();
    expect(previewNode?.type).toBe("output-audio");
  });

  it("should have correct edge connections", () => {
    const edges = textToSpeechTemplate.edges;

    const textToSpeech = edges.find(
      (e) => e.source === "text-to-speak" && e.target === "speech-generator"
    );
    expect(textToSpeech).toBeDefined();
    expect(textToSpeech?.sourceOutput).toBe("value");
    expect(textToSpeech?.targetInput).toBe("prompt");

    const speechToPreview = edges.find(
      (e) => e.source === "speech-generator" && e.target === "audio-preview"
    );
    expect(speechToPreview).toBeDefined();
    expect(speechToPreview?.sourceOutput).toBe("audio");
    expect(speechToPreview?.targetInput).toBe("value");
  });
});
