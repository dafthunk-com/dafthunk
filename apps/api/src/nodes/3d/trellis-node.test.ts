import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { TrellisNode } from "./trellis-node";

describe("TrellisNode", () => {
  const nodeId = "trellis-test";
  const node = new TrellisNode({
    nodeId,
  } as unknown as Node);

  const createContext = (
    inputs: Record<string, unknown>,
    envOverrides: Record<string, unknown> = {}
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
        ...envOverrides,
      },
      getIntegration: vi.fn(),
      getSecret: vi.fn(),
    }) as unknown as NodeContext;

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
      const imagesInput = TrellisNode.nodeType.inputs.find(
        (i) => i.name === "images"
      );
      expect(imagesInput).toBeDefined();
      expect(imagesInput?.required).toBe(true);
      expect(imagesInput?.type).toBe("image");
      expect(imagesInput?.repeated).toBe(true);
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
    it("should return error for missing images input", async () => {
      const result = await node.execute(
        createContext({}, { REPLICATE_API_TOKEN: "test-token" })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
      expect(result.error).toContain("images");
    });

    it("should return error for invalid images input", async () => {
      const result = await node.execute(
        createContext(
          { images: "not-an-array" },
          { REPLICATE_API_TOKEN: "test-token" }
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });

    it("should return error for missing REPLICATE_API_TOKEN", async () => {
      const testImage = {
        data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        mimeType: "image/png",
      };

      const result = await node.execute(
        createContext({ images: [testImage] }, { REPLICATE_API_TOKEN: "" })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain(
        "REPLICATE_API_TOKEN environment variable is not configured"
      );
    });

    it("should return error for missing R2 credentials", async () => {
      const testImage = {
        data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        mimeType: "image/png",
      };

      const result = await node.execute(
        createContext(
          { images: [testImage] },
          {
            REPLICATE_API_TOKEN: "test-token",
            R2_ACCESS_KEY_ID: undefined,
            R2_SECRET_ACCESS_KEY: undefined,
            R2_BUCKET_NAME: undefined,
          }
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("ObjectStore not available in context");
    });
  });
});
