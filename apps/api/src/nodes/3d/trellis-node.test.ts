import { Node } from "@dafthunk/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { TrellisNode } from "./trellis-node";

describe("TrellisNode", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  const nodeId = "trellis-test";
  const node = new TrellisNode({
    nodeId,
  } as unknown as Node);

  const createContext = (
    inputs: Record<string, unknown>,
    secretValue?: string
  ): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      mode: "dev" as const,
      secrets: {},
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
        CLOUDFLARE_ACCOUNT_ID: "test-account",
        CLOUDFLARE_AI_GATEWAY_ID: "test-gateway",
        CLOUDFLARE_API_TOKEN: "test-cf-token",
      },
      getIntegration: vi.fn(),
      getSecret: vi.fn().mockResolvedValue(secretValue),
    }) as unknown as NodeContext;

  const testImageUrl = "https://replicate.delivery/pbxt/example/test-image.png";

  describe("nodeType", () => {
    it("should have correct node type configuration", () => {
      expect(TrellisNode.nodeType.id).toBe("trellis");
      expect(TrellisNode.nodeType.name).toBe("3D Generation (Trellis)");
      expect(TrellisNode.nodeType.type).toBe("trellis");
      expect(TrellisNode.nodeType.tags).toContain("AI");
      expect(TrellisNode.nodeType.tags).toContain("3D");
      expect(TrellisNode.nodeType.tags).toContain("Replicate");
    });

    it("should have required inputs", () => {
      const imageUrlInput = TrellisNode.nodeType.inputs.find(
        (i) => i.name === "image_url"
      );
      expect(imageUrlInput).toBeDefined();
      expect(imageUrlInput?.required).toBe(true);
      expect(imageUrlInput?.type).toBe("string");

      const apiKeyInput = TrellisNode.nodeType.inputs.find(
        (i) => i.name === "replicate_api_key"
      );
      expect(apiKeyInput).toBeDefined();
      expect(apiKeyInput?.required).toBe(true);
      expect(apiKeyInput?.type).toBe("secret");
    });

    it("should have gltf output", () => {
      const modelOutput = TrellisNode.nodeType.outputs.find(
        (o) => o.name === "model"
      );
      expect(modelOutput).toBeDefined();
      expect(modelOutput?.type).toBe("gltf");
    });
  });

  describe("execute", () => {
    it("should return error for missing image_url", async () => {
      const result = await node.execute(
        createContext({ replicate_api_key: "my-secret" }, "test-api-key")
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });

    it("should return error for invalid image_url", async () => {
      const result = await node.execute(
        createContext(
          { image_url: "not-a-url", replicate_api_key: "my-secret" },
          "test-api-key"
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });

    it("should return error for missing API key reference", async () => {
      const result = await node.execute(
        createContext({ image_url: testImageUrl })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Replicate API key is required");
    });

    it("should return error when secret not found", async () => {
      const result = await node.execute(
        createContext(
          { image_url: testImageUrl, replicate_api_key: "my-secret" },
          undefined // secret not found
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain('Secret "my-secret" not found');
    });

    it("should successfully generate 3D model", async () => {
      // Mock successful prediction creation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "pred-123",
            status: "succeeded",
            output: {
              model_file: "https://example.com/model.glb",
              color_video: "https://example.com/video.mp4",
            },
          }),
        })
        // Mock model download
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () =>
            new Uint8Array([0x67, 0x6c, 0x54, 0x46]).buffer, // glTF magic
        })
        // Mock video download
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new Uint8Array([0x00, 0x00]).buffer,
        });

      const result = await node.execute(
        createContext(
          { image_url: testImageUrl, replicate_api_key: "my-secret" },
          "actual-api-key-value"
        )
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.model).toBeDefined();
      expect(result.outputs?.model.mimeType).toBe("model/gltf-binary");
      expect(result.outputs?.video).toBeDefined();

      // Verify the request was made with correct headers
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/predictions"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer actual-api-key-value",
            "cf-aig-authorization": "Bearer test-cf-token",
          }),
        })
      );
    });

    it("should pass image URL to Replicate API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "pred-123",
          status: "succeeded",
          output: {
            model_file: "https://example.com/model.glb",
          },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () =>
          new Uint8Array([0x67, 0x6c, 0x54, 0x46]).buffer,
      });

      await node.execute(
        createContext(
          { image_url: testImageUrl, replicate_api_key: "my-secret" },
          "actual-api-key-value"
        )
      );

      // Verify the image URL was passed correctly
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.input.images).toEqual([testImageUrl]);
    });

    it("should handle failed prediction", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "pred-123",
          status: "failed",
          error: "Model failed to process image",
        }),
      });

      const result = await node.execute(
        createContext(
          { image_url: testImageUrl, replicate_api_key: "my-secret" },
          "actual-api-key-value"
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Trellis generation failed");
    });

    it("should handle API error during prediction creation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const result = await node.execute(
        createContext(
          { image_url: testImageUrl, replicate_api_key: "my-secret" },
          "actual-api-key-value"
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Failed to create Replicate prediction");
    });
  });
});
