import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonContainsNode } from "./json-contains-node";

describe("JsonContainsNode", () => {
  const nodeId = "json-contains";
  const node = new JsonContainsNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should return false for null input", async () => {
      const result = await node.execute({
        inputs: { json: null, value: "test" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(false);
    });

    it("should return false for undefined input", async () => {
      const result = await node.execute({
        inputs: { json: undefined, value: "test" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(false);
    });

    it("should find string in array", async () => {
      const result = await node.execute({
        inputs: { json: ["apple", "banana", "cherry"], value: "banana" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should not find string in array", async () => {
      const result = await node.execute({
        inputs: { json: ["apple", "banana", "cherry"], value: "orange" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should find number in array", async () => {
      const result = await node.execute({
        inputs: { json: [1, 2, 3, 4, 5], value: 3 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should find object in array", async () => {
      const result = await node.execute({
        inputs: {
          json: [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
          ],
          value: { name: "Jane", age: 25 },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should find value at specific path", async () => {
      const result = await node.execute({
        inputs: {
          json: { items: ["apple", "banana", "cherry"] },
          value: "banana",
          path: "$.items",
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should not find value at non-existent path", async () => {
      const result = await node.execute({
        inputs: {
          json: { items: ["apple", "banana", "cherry"] },
          value: "banana",
          path: "$.nonexistent",
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should find nested object", async () => {
      const result = await node.execute({
        inputs: {
          json: {
            user: {
              profile: { name: "John", age: 30 },
            },
          },
          value: { name: "John", age: 30 },
          path: "$.user.profile",
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should handle array index in path", async () => {
      const result = await node.execute({
        inputs: {
          json: {
            items: [
              ["a", "b", "c"],
              ["d", "e", "f"],
            ],
          },
          value: "e",
          path: "$.items[1]",
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should return false for null search value", async () => {
      const result = await node.execute({
        inputs: { json: ["apple", "banana", "cherry"], value: null },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should return false for undefined search value", async () => {
      const result = await node.execute({
        inputs: { json: ["apple", "banana", "cherry"], value: undefined },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(true);
    });
  });
});
