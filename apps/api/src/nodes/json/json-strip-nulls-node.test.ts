import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonStripNullsNode } from "./json-strip-nulls-node";

describe("JsonStripNullsNode", () => {
  const nodeId = "json-strip-nulls";
  const node = new JsonStripNullsNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should remove null values from object", async () => {
      const result = await node.execute({
        inputs: {
          value: { a: 1, b: null, c: "test", d: null },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ a: 1, c: "test" });
      expect(result.outputs?.nullsRemoved).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should remove null values from array", async () => {
      const result = await node.execute({
        inputs: {
          value: [1, null, "test", null, 5],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual([1, "test", 5]);
      expect(result.outputs?.nullsRemoved).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should recursively remove null values", async () => {
      const result = await node.execute({
        inputs: {
          value: {
            a: 1,
            b: null,
            c: [1, null, 3],
            d: { x: null, y: "test" },
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        a: 1,
        c: [1, 3],
        d: { y: "test" },
      });
      expect(result.outputs?.nullsRemoved).toBe(3);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle shallow removal when recursive is false", async () => {
      const result = await node.execute({
        inputs: {
          value: {
            a: 1,
            b: null,
            c: [1, null, 3],
            d: { x: null, y: "test" },
          },
          recursive: false,
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        a: 1,
        c: [1, null, 3],
        d: { x: null, y: "test" },
      });
      expect(result.outputs?.nullsRemoved).toBe(1);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle null input", async () => {
      const result = await node.execute({
        inputs: { value: null },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBeNull();
      expect(result.outputs?.nullsRemoved).toBe(0);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle primitive values", async () => {
      const result = await node.execute({
        inputs: { value: "test" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe("test");
      expect(result.outputs?.nullsRemoved).toBe(0);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle empty object", async () => {
      const result = await node.execute({
        inputs: { value: {} },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
      expect(result.outputs?.nullsRemoved).toBe(0);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle empty array", async () => {
      const result = await node.execute({
        inputs: { value: [] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual([]);
      expect(result.outputs?.nullsRemoved).toBe(0);
      expect(result.outputs?.success).toBe(true);
    });
  });
});
