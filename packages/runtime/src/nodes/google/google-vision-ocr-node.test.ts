import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { GoogleVisionOcrNode } from "./google-vision-ocr-node";

describe("GoogleVisionOcrNode", () => {
  const nodeId = "google-vision-ocr-test";
  const node = new GoogleVisionOcrNode({
    nodeId,
  } as unknown as Node);

  const createContext = (
    inputs: Record<string, unknown>,
    overrides: Partial<NodeContext> = {}
  ): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      mode: "dev" as const,
      env: {
        DB: {} as D1Database,
        AI: {} as Ai,
        AI_OPTIONS: {} as AiOptions,
        RESSOURCES: {} as R2Bucket,
        DATASETS: {} as R2Bucket,
        DATASETS_AUTORAG: "",
        DATABASE: {} as DurableObjectNamespace,
        WORKFLOW_QUEUE: {} as Queue,
        EMAIL_DOMAIN: "",
      },
      getIntegration: vi.fn(),
      getSecret: vi.fn().mockResolvedValue("test-api-key-value"),
      ...overrides,
    }) as unknown as NodeContext;

  const createMockImage = (mimeType = "image/png") => ({
    data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    mimeType,
  });

  describe("nodeType", () => {
    it("should have correct node type configuration", () => {
      expect(GoogleVisionOcrNode.nodeType.id).toBe("google-vision-ocr");
      expect(GoogleVisionOcrNode.nodeType.name).toBe("Google Vision OCR");
      expect(GoogleVisionOcrNode.nodeType.type).toBe("google-vision-ocr");
      expect(GoogleVisionOcrNode.nodeType.tags).toContain("Google");
      expect(GoogleVisionOcrNode.nodeType.tags).toContain("OCR");
      expect(GoogleVisionOcrNode.nodeType.tags).toContain("Vision");
    });

    it("should have required image input", () => {
      const imageInput = GoogleVisionOcrNode.nodeType.inputs.find(
        (i) => i.name === "image"
      );
      expect(imageInput).toBeDefined();
      expect(imageInput?.required).toBe(true);
      expect(imageInput?.type).toBe("image");
    });

    it("should have required api_key input", () => {
      const apiKeyInput = GoogleVisionOcrNode.nodeType.inputs.find(
        (i) => i.name === "api_key"
      );
      expect(apiKeyInput).toBeDefined();
      expect(apiKeyInput?.required).toBe(true);
      expect(apiKeyInput?.type).toBe("secret");
    });

    it("should have text output", () => {
      const textOutput = GoogleVisionOcrNode.nodeType.outputs.find(
        (o) => o.name === "text"
      );
      expect(textOutput).toBeDefined();
      expect(textOutput?.type).toBe("string");
    });

    it("should have blocks output", () => {
      const blocksOutput = GoogleVisionOcrNode.nodeType.outputs.find(
        (o) => o.name === "blocks"
      );
      expect(blocksOutput).toBeDefined();
      expect(blocksOutput?.type).toBe("json");
    });
  });

  describe("execute", () => {
    it("should return error for missing image input", async () => {
      const result = await node.execute(
        createContext({ api_key: "my-secret" })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Missing required input: image");
    });

    it("should return error for invalid image input", async () => {
      const result = await node.execute(
        createContext({
          image: { data: "not-uint8array", mimeType: "image/png" },
          api_key: "my-secret",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid image input");
    });

    it("should return error for missing api_key input", async () => {
      const result = await node.execute(
        createContext({ image: createMockImage() })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Missing required input: api_key");
    });

    it("should return error when secret cannot be resolved", async () => {
      const result = await node.execute(
        createContext(
          {
            image: createMockImage(),
            api_key: "nonexistent-secret",
          },
          {
            getSecret: vi.fn().mockResolvedValue(undefined),
          } as Partial<NodeContext>
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Could not resolve API key secret");
    });

    it("should return error for invalid detection type", async () => {
      const result = await node.execute(
        createContext({
          image: createMockImage(),
          api_key: "my-secret",
          detection_type: "INVALID_TYPE",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid detection_type");
    });

    it("should successfully extract text from image", async () => {
      const mockResponse = {
        responses: [
          {
            textAnnotations: [
              {
                locale: "en",
                description: "Hello World\nLine 2",
                boundingPoly: {
                  vertices: [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 100, y: 50 },
                    { x: 0, y: 50 },
                  ],
                },
              },
              {
                description: "Hello",
                boundingPoly: {
                  vertices: [
                    { x: 0, y: 0 },
                    { x: 50, y: 0 },
                    { x: 50, y: 25 },
                    { x: 0, y: 25 },
                  ],
                },
              },
              {
                description: "World",
                boundingPoly: {
                  vertices: [
                    { x: 55, y: 0 },
                    { x: 100, y: 0 },
                    { x: 100, y: 25 },
                    { x: 55, y: 25 },
                  ],
                },
              },
            ],
            fullTextAnnotation: {
              text: "Hello World\nLine 2",
              pages: [
                {
                  property: {
                    detectedLanguages: [
                      { languageCode: "en", confidence: 0.95 },
                    ],
                  },
                  confidence: 0.98,
                },
              ],
            },
          },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await node.execute(
        createContext({
          image: createMockImage(),
          api_key: "my-secret",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("Hello World\nLine 2");
      expect(result.outputs?.language).toBe("en");
      expect(result.outputs?.confidence).toBe(0.98);
      expect(Array.isArray(result.outputs?.blocks)).toBe(true);
      expect((result.outputs?.blocks as unknown[]).length).toBe(2);

      vi.unstubAllGlobals();
    });

    it("should handle API error response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          text: () => Promise.resolve("API key not valid"),
        })
      );

      const result = await node.execute(
        createContext({
          image: createMockImage(),
          api_key: "my-secret",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Google Vision API error (403)");
      expect(result.error).toContain("API key not valid");

      vi.unstubAllGlobals();
    });

    it("should handle response-level error", async () => {
      const mockResponse = {
        responses: [
          {
            error: {
              code: 3,
              message: "Image processing failed",
            },
          },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await node.execute(
        createContext({
          image: createMockImage(),
          api_key: "my-secret",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Image processing failed");

      vi.unstubAllGlobals();
    });

    it("should handle image with no text detected", async () => {
      const mockResponse = {
        responses: [
          {
            // No textAnnotations or fullTextAnnotation when no text found
          },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await node.execute(
        createContext({
          image: createMockImage(),
          api_key: "my-secret",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("");
      expect(result.outputs?.blocks).toEqual([]);
      expect(result.outputs?.language).toBe("");
      expect(result.outputs?.confidence).toBe(0);

      vi.unstubAllGlobals();
    });

    it("should pass language hints to the API", async () => {
      const mockResponse = {
        responses: [
          {
            fullTextAnnotation: {
              text: "Bonjour le monde",
              pages: [
                {
                  property: {
                    detectedLanguages: [
                      { languageCode: "fr", confidence: 0.99 },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await node.execute(
        createContext({
          image: createMockImage(),
          api_key: "my-secret",
          language_hints: "fr,de",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("Bonjour le monde");

      // Verify language hints were passed in the request
      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.requests[0].imageContext.languageHints).toEqual([
        "fr",
        "de",
      ]);

      vi.unstubAllGlobals();
    });

    it("should use TEXT_DETECTION when specified", async () => {
      const mockResponse = {
        responses: [
          {
            textAnnotations: [
              {
                description: "Simple text",
                boundingPoly: {
                  vertices: [{ x: 0, y: 0 }],
                },
              },
            ],
          },
        ],
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await node.execute(
        createContext({
          image: createMockImage(),
          api_key: "my-secret",
          detection_type: "TEXT_DETECTION",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("Simple text");

      // Verify the feature type in the request
      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.requests[0].features[0].type).toBe("TEXT_DETECTION");

      vi.unstubAllGlobals();
    });

    it("should handle network errors gracefully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network timeout"))
      );

      const result = await node.execute(
        createContext({
          image: createMockImage(),
          api_key: "my-secret",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Network timeout");

      vi.unstubAllGlobals();
    });

    it("should handle empty API response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ responses: [] }),
        })
      );

      const result = await node.execute(
        createContext({
          image: createMockImage(),
          api_key: "my-secret",
        })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Empty response");

      vi.unstubAllGlobals();
    });

    it("should handle missing getSecret function", async () => {
      const result = await node.execute(
        createContext(
          {
            image: createMockImage(),
            api_key: "my-secret",
          },
          {
            getSecret: undefined,
          } as Partial<NodeContext>
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Could not resolve API key secret");
    });
  });
});
