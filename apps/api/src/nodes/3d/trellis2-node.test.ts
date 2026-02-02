import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { Trellis2Node } from "./trellis2-node";

describe("Trellis2Node", () => {
  const nodeId = "trellis2-test";
  const node = new Trellis2Node({
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
      expect(Trellis2Node.nodeType.id).toBe("trellis2");
      expect(Trellis2Node.nodeType.name).toBe("3D Generation (Trellis 2)");
      expect(Trellis2Node.nodeType.type).toBe("trellis2");
      expect(Trellis2Node.nodeType.tags).toContain("AI");
      expect(Trellis2Node.nodeType.tags).toContain("3D");
      expect(Trellis2Node.nodeType.tags).toContain("Replicate");
    });

    it("should have required image input", () => {
      const imageInput = Trellis2Node.nodeType.inputs.find(
        (i) => i.name === "image"
      );
      expect(imageInput).toBeDefined();
      expect(imageInput?.required).toBe(true);
      expect(imageInput?.type).toBe("image");
      expect(imageInput?.repeated).toBeUndefined(); // Single image only
    });

    it("should have gltf output", () => {
      const modelOutput = Trellis2Node.nodeType.outputs.find(
        (o) => o.name === "model"
      );
      expect(modelOutput).toBeDefined();
      expect(modelOutput?.type).toBe("gltf");
    });

    it("should have video output", () => {
      const videoOutput = Trellis2Node.nodeType.outputs.find(
        (o) => o.name === "video"
      );
      expect(videoOutput).toBeDefined();
      expect(videoOutput?.type).toBe("blob");
    });

    it("should have no_background_image output", () => {
      const imageOutput = Trellis2Node.nodeType.outputs.find(
        (o) => o.name === "no_background_image"
      );
      expect(imageOutput).toBeDefined();
      expect(imageOutput?.type).toBe("image");
    });
  });

  describe("execute", () => {
    it("should return error for missing image input", async () => {
      const result = await node.execute(
        createContext({}, { REPLICATE_API_TOKEN: "test-token" })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
      expect(result.error).toContain("image");
    });

    it("should return error for invalid image input", async () => {
      const result = await node.execute(
        createContext(
          { image: "not-an-object" },
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
        createContext({ image: testImage }, { REPLICATE_API_TOKEN: "" })
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
          { image: testImage },
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

    it("should validate pipeline_type enum", async () => {
      const testImage = {
        data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        mimeType: "image/png",
      };

      const result = await node.execute(
        createContext(
          { image: testImage, pipeline_type: "invalid" },
          { REPLICATE_API_TOKEN: "test-token" }
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });

    it("should validate texture_size range", async () => {
      const testImage = {
        data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        mimeType: "image/png",
      };

      const result = await node.execute(
        createContext(
          { image: testImage, texture_size: 512 }, // Below minimum
          { REPLICATE_API_TOKEN: "test-token" }
        )
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });
  });
});
