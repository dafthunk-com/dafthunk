import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonArrayLengthNode } from "./json-array-length-node";

describe("JsonArrayLengthNode", () => {
  const nodeId = "json-array-length";
  const node = new JsonArrayLengthNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should return 0 for null input", async () => {
      const result = await node.execute({
        inputs: { array: null },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
      expect(result.outputs?.isArray).toBe(false);
    });

    it("should return 0 for undefined input", async () => {
      const result = await node.execute({
        inputs: { array: undefined },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
      expect(result.outputs?.isArray).toBe(false);
    });

    it("should return 0 for non-array input", async () => {
      const result = await node.execute({
        inputs: { array: "not an array" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
      expect(result.outputs?.isArray).toBe(false);
    });

    it("should return 0 for object input", async () => {
      const result = await node.execute({
        inputs: { array: { key: "value" } },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
      expect(result.outputs?.isArray).toBe(false);
    });

    it("should return 0 for empty array input", async () => {
      const result = await node.execute({
        inputs: { array: [] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 1 for single element array", async () => {
      const result = await node.execute({
        inputs: { array: ["single"] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(1);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 3 for three element array", async () => {
      const result = await node.execute({
        inputs: { array: [1, 2, 3] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(3);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 5 for mixed type array", async () => {
      const result = await node.execute({
        inputs: { array: ["hello", 42, true, null, { key: "value" }] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(5);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 3 for nested array", async () => {
      const result = await node.execute({
        inputs: {
          array: [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(3);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 3 for array with objects", async () => {
      const result = await node.execute({
        inputs: {
          array: [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
            { name: "Bob", age: 35 },
          ],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(3);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 4 for array with strings", async () => {
      const result = await node.execute({
        inputs: { array: ["apple", "banana", "cherry", "date"] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(4);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 5 for array with numbers", async () => {
      const result = await node.execute({
        inputs: { array: [1.5, 2.7, 3.14, 42, 0] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(5);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 4 for array with booleans", async () => {
      const result = await node.execute({
        inputs: { array: [true, false, true, false] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(4);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 6 for array with null values", async () => {
      const result = await node.execute({
        inputs: { array: [null, "value", null, 42, null, "test"] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(6);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 1000 for large array", async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const result = await node.execute({
        inputs: { array: largeArray },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(1000);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 1 for array with single object", async () => {
      const result = await node.execute({
        inputs: {
          array: [{ complex: "object", with: "nested", data: [1, 2, 3] }],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(1);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 2 for array with functions (functions are objects)", async () => {
      const result = await node.execute({
        inputs: { array: [() => {}, () => {}] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(2);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 3 for array with Date objects", async () => {
      const result = await node.execute({
        inputs: { array: [new Date(), new Date(), new Date()] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(3);
      expect(result.outputs?.isArray).toBe(true);
    });

    it("should return 0 for sparse array", async () => {
      const sparseArray = new Array(5);
      sparseArray[1] = "value";
      sparseArray[3] = "another";

      const result = await node.execute({
        inputs: { array: sparseArray },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(5);
      expect(result.outputs?.isArray).toBe(true);
    });
  });
});
