import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonFlattenNode } from "./json-flatten-node";

describe("JsonFlattenNode", () => {
  const nodeId = "json-flatten";
  const node = new JsonFlattenNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should flatten nested object with default separator", async () => {
      const result = await node.execute({
        inputs: {
          value: {
            a: 1,
            b: { c: 2, d: { e: 3 } },
            f: [1, 2, 3],
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        a: 1,
        "b.c": 2,
        "b.d.e": 3,
        "f.0": 1,
        "f.1": 2,
        "f.2": 3,
      });
      expect(result.outputs?.keyCount).toBe(6);
      expect(result.outputs?.success).toBe(true);
    });

    it("should flatten with custom separator", async () => {
      const result = await node.execute({
        inputs: {
          value: {
            a: 1,
            b: { c: 2 },
          },
          separator: "_",
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        a: 1,
        b_c: 2,
      });
      expect(result.outputs?.keyCount).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle arrays when includeArrays is true", async () => {
      const result = await node.execute({
        inputs: {
          value: {
            items: [
              { name: "item1", value: 10 },
              { name: "item2", value: 20 },
            ],
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        "items.0.name": "item1",
        "items.0.value": 10,
        "items.1.name": "item2",
        "items.1.value": 20,
      });
      expect(result.outputs?.keyCount).toBe(4);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle arrays when includeArrays is false", async () => {
      const result = await node.execute({
        inputs: {
          value: {
            items: [
              { name: "item1", value: 10 },
              { name: "item2", value: 20 },
            ],
          },
          includeArrays: false,
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: [
          { name: "item1", value: 10 },
          { name: "item2", value: 20 },
        ],
      });
      expect(result.outputs?.keyCount).toBe(1);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle primitive values", async () => {
      const result = await node.execute({
        inputs: { value: "test" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ value: "test" });
      expect(result.outputs?.keyCount).toBe(1);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle numbers", async () => {
      const result = await node.execute({
        inputs: { value: 42 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ value: 42 });
      expect(result.outputs?.keyCount).toBe(1);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle null input", async () => {
      const result = await node.execute({
        inputs: { value: null },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
      expect(result.outputs?.keyCount).toBe(0);
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
      expect(result.outputs?.keyCount).toBe(0);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle empty array", async () => {
      const result = await node.execute({
        inputs: { value: [] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
      expect(result.outputs?.keyCount).toBe(0);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle complex nested structure", async () => {
      const result = await node.execute({
        inputs: {
          value: {
            user: {
              name: "John",
              address: {
                street: "123 Main St",
                city: "Anytown",
              },
              hobbies: ["reading", "gaming"],
            },
            active: true,
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        "user.name": "John",
        "user.address.street": "123 Main St",
        "user.address.city": "Anytown",
        "user.hobbies.0": "reading",
        "user.hobbies.1": "gaming",
        active: true,
      });
      expect(result.outputs?.keyCount).toBe(6);
      expect(result.outputs?.success).toBe(true);
    });
  });
});
