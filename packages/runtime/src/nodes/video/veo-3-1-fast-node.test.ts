import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import type { NodeContext } from "../../runtime/node-types";
import { Veo31FastNode } from "./veo-3-1-fast-node";

describe("Veo31FastNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "veo-3-1-fast",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {
        REPLICATE_API_TOKEN: "test-token",
      },
    }) as unknown as NodeContext;

  describe("validation", () => {
    it("should return error for missing REPLICATE_API_TOKEN", async () => {
      const node = new Veo31FastNode({
        nodeId: "veo-3-1-fast",
      } as unknown as Node);
      const ctx = {
        ...createContext({ prompt: "A cat" }),
        env: {},
      } as unknown as NodeContext;
      const result = await node.execute(ctx);

      expect(result.status).toBe("error");
      expect(result.error).toContain("REPLICATE_API_TOKEN");
    });

    it("should return error for missing prompt", async () => {
      const node = new Veo31FastNode({
        nodeId: "veo-3-1-fast",
      } as unknown as Node);
      const result = await node.execute(createContext({}));

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });

    it("should return error for empty prompt", async () => {
      const node = new Veo31FastNode({
        nodeId: "veo-3-1-fast",
      } as unknown as Node);
      const result = await node.execute(createContext({ prompt: "" }));

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });

    it("should return error for invalid aspect ratio", async () => {
      const node = new Veo31FastNode({
        nodeId: "veo-3-1-fast",
      } as unknown as Node);
      const result = await node.execute(
        createContext({ prompt: "A cat", aspect_ratio: "4:3" })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });

    it("should return error for invalid resolution", async () => {
      const node = new Veo31FastNode({
        nodeId: "veo-3-1-fast",
      } as unknown as Node);
      const result = await node.execute(
        createContext({ prompt: "A cat", resolution: "4k" })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });

    it("should return error for invalid duration", async () => {
      const node = new Veo31FastNode({
        nodeId: "veo-3-1-fast",
      } as unknown as Node);
      const result = await node.execute(
        createContext({ prompt: "A cat", duration: 10 })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });
  });

  describe("node type metadata", () => {
    it("should have correct id and type", () => {
      expect(Veo31FastNode.nodeType.id).toBe("veo-3-1-fast");
      expect(Veo31FastNode.nodeType.type).toBe("veo-3-1-fast");
    });

    it("should not be inlinable", () => {
      expect(Veo31FastNode.nodeType.inlinable).toBe(false);
    });

    it("should have correct default usage", () => {
      expect(Veo31FastNode.nodeType.usage).toBe(640);
    });

    it("should have video output type", () => {
      expect(Veo31FastNode.nodeType.outputs).toHaveLength(1);
      expect(Veo31FastNode.nodeType.outputs[0].type).toBe("video");
    });

    it("should have prompt as only required input", () => {
      const required = Veo31FastNode.nodeType.inputs.filter((i) => i.required);
      expect(required).toHaveLength(1);
      expect(required[0].name).toBe("prompt");
    });

    it("should have reference URL pointing to Replicate", () => {
      expect(Veo31FastNode.nodeType.referenceUrl).toContain("replicate.com");
    });
  });
});
