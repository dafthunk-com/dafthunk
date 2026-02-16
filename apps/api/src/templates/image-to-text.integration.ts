import { env } from "cloudflare:test";
import { Gemini25FlashImageUnderstandingNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-flash-image-understanding-node";
import { Gemini25FlashTtsNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-flash-tts-node";
import { HttpRequestNode } from "@dafthunk/runtime/nodes/http/http-request-node";
import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "../context";
import { imageToTextTemplate } from "./image-to-text";

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: vi.fn().mockImplementation(({ model }) => {
        if (model === "gemini-2.5-flash-preview-tts") {
          return Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        data: Buffer.from(
                          new Uint8Array([1, 2, 3, 4, 5])
                        ).toString("base64"),
                        mimeType: "audio/L16;rate=24000",
                      },
                    },
                  ],
                },
              },
            ],
            usageMetadata: {
              promptTokenCount: 50,
              candidatesTokenCount: 200,
              totalTokenCount: 250,
            },
          });
        }

        // gemini-2.5-flash (image understanding)
        return Promise.resolve({
          candidates: [
            {
              content: {
                parts: [{ text: "Extracted text from image" }],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 150,
            candidatesTokenCount: 25,
            totalTokenCount: 175,
          },
        });
      }),
    };
  },
}));

describe("Image to Text Template", () => {
  it("should have valid structure", () => {
    expect(imageToTextTemplate.nodes).toHaveLength(3);
    expect(imageToTextTemplate.edges).toHaveLength(2);

    const nodeIds = new Set(imageToTextTemplate.nodes.map((n) => n.id));
    for (const edge of imageToTextTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(imageToTextTemplate.id).toBe("image-to-text");
    expect(imageToTextTemplate.name).toBe("Image to Text");
    expect(imageToTextTemplate.trigger).toBe("http_request");
    expect(imageToTextTemplate.tags).toContain("ai");
    expect(imageToTextTemplate.tags).toContain("image");
  });

  it("should have correct node configuration", () => {
    const requestNode = imageToTextTemplate.nodes.find(
      (n) => n.id === "request"
    );
    expect(requestNode).toBeDefined();
    expect(requestNode?.type).toBe("http-request");

    const imageUnderstandingNode = imageToTextTemplate.nodes.find(
      (n) => n.id === "image-understanding"
    );
    expect(imageUnderstandingNode).toBeDefined();
    expect(imageUnderstandingNode?.type).toBe(
      "gemini-2-5-flash-image-understanding"
    );

    const ttsNode = imageToTextTemplate.nodes.find(
      (n) => n.id === "text-to-speech"
    );
    expect(ttsNode).toBeDefined();
    expect(ttsNode?.type).toBe("gemini-2-5-flash-tts");
  });

  it("should have correct edge connections", () => {
    const edges = imageToTextTemplate.edges;

    const requestToUnderstanding = edges.find(
      (e) => e.source === "request" && e.target === "image-understanding"
    );
    expect(requestToUnderstanding).toBeDefined();
    expect(requestToUnderstanding?.sourceOutput).toBe("body");
    expect(requestToUnderstanding?.targetInput).toBe("image");

    const understandingToTts = edges.find(
      (e) =>
        e.source === "image-understanding" && e.target === "text-to-speech"
    );
    expect(understandingToTts).toBeDefined();
    expect(understandingToTts?.sourceOutput).toBe("text");
    expect(understandingToTts?.targetInput).toBe("text");
  });

  it("should execute the full pipeline", async () => {
    const mockImage = {
      data: new Uint8Array([1, 2, 3, 4, 5]),
      mimeType: "image/png",
    };

    // Step 1: HttpRequestNode extracts body from HTTP request
    const requestNodeDef = imageToTextTemplate.nodes.find(
      (n) => n.id === "request"
    )!;
    const requestNode = new HttpRequestNode(requestNodeDef);
    const requestResult = await requestNode.execute({
      nodeId: requestNodeDef.id,
      inputs: {},
      env: env as Bindings,
      httpRequest: {
        method: "POST",
        url: "https://example.com/workflow",
        path: "/workflow",
        headers: { "content-type": "image/png" },
        queryParams: {},
        body: mockImage,
      },
    } as any);

    expect(requestResult.status).toBe("completed");
    expect(requestResult.outputs?.body).toBeDefined();
    expect(requestResult.outputs?.body.mimeType).toBe("image/png");

    // Step 2: Gemini Image Understanding extracts text from image
    const understandingNodeDef = imageToTextTemplate.nodes.find(
      (n) => n.id === "image-understanding"
    )!;
    const understandingNode = new Gemini25FlashImageUnderstandingNode(
      understandingNodeDef
    );
    const understandingResult = await understandingNode.execute({
      nodeId: understandingNodeDef.id,
      inputs: {
        image: requestResult.outputs?.body,
        prompt: "Extract the text from the image",
      },
      env: env as Bindings,
    } as any);

    expect(understandingResult.status).toBe("completed");
    expect(understandingResult.outputs?.text).toBe(
      "Extracted text from image"
    );

    // Step 3: Gemini TTS converts extracted text to speech
    const ttsNodeDef = imageToTextTemplate.nodes.find(
      (n) => n.id === "text-to-speech"
    )!;
    const ttsNode = new Gemini25FlashTtsNode(ttsNodeDef);
    const ttsResult = await ttsNode.execute({
      nodeId: ttsNodeDef.id,
      inputs: {
        text: understandingResult.outputs?.text,
        voice: "Kore",
      },
      env: env as Bindings,
    } as any);

    expect(ttsResult.status).toBe("completed");
    expect(ttsResult.outputs?.audio).toBeDefined();
    expect(ttsResult.outputs?.audio.data).toBeInstanceOf(Uint8Array);
    expect(ttsResult.outputs?.audio.mimeType).toBe("audio/wav");
  });
});
