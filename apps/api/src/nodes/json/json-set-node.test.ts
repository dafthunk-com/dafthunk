import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonSetNode } from "./json-set-node";

describe("JsonSetNode", () => {
  const nodeId = "json-set";
  const node = new JsonSetNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should return null for null input", async () => {
      const result = await node.execute({
        inputs: { json: null, path: "$.test", value: "new" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBeNull();
      expect(result.outputs?.success).toBe(false);
      expect(result.outputs?.pathExists).toBe(false);
    });

    it("should return original for empty path", async () => {
      const input = { name: "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: "", value: "new" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual(input);
      expect(result.outputs?.success).toBe(false);
      expect(result.outputs?.pathExists).toBe(false);
    });

    it("should set value at simple object path", async () => {
      const input = { name: "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: "$.name", value: "Jane" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "Jane", age: 30 });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(true);
    });

    it("should set value at nested object path", async () => {
      const input = { user: { name: "John", age: 30 } };
      const result = await node.execute({
        inputs: { json: input, path: "$.user.name", value: "Jane" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: { name: "Jane", age: 30 },
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(true);
    });

    it("should set value at array index", async () => {
      const input = { items: ["apple", "banana", "cherry"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[1]", value: "orange" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "orange", "cherry"],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(true);
    });

    it("should set value at nested array path", async () => {
      const input = { data: { items: ["apple", "banana", "cherry"] } };
      const result = await node.execute({
        inputs: { json: input, path: "$.data.items[0]", value: "orange" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        data: { items: ["orange", "banana", "cherry"] },
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(true);
    });

    it("should create new path if it doesn't exist", async () => {
      const input = { name: "John" };
      const result = await node.execute({
        inputs: { json: input, path: "$.age", value: 30 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John", age: 30 });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(false);
    });

    it("should create nested path if it doesn't exist", async () => {
      const input = { name: "John" };
      const result = await node.execute({
        inputs: { json: input, path: "$.user.profile.name", value: "Jane" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        user: { profile: { name: "Jane" } },
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(false);
    });

    it("should create array and set value", async () => {
      const input = { name: "John" };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[2]", value: "apple" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        items: [null, null, "apple"],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(false);
    });

    it("should handle complex nested path creation", async () => {
      const input = {};
      const result = await node.execute({
        inputs: {
          json: input,
          path: "$.users[0].profile.settings.theme",
          value: "dark",
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        users: [
          {
            profile: {
              settings: {
                theme: "dark",
              },
            },
          },
        ],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(false);
    });

    it("should handle quoted property names", async () => {
      const input = { "user-name": "John" };
      const result = await node.execute({
        inputs: { json: input, path: '$["user-name"]', value: "Jane" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ "user-name": "Jane" });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(true);
    });

    it("should handle mixed value types", async () => {
      const input = { data: {} };
      const result = await node.execute({
        inputs: {
          json: input,
          path: "$.data",
          value: {
            string: "hello",
            number: 42,
            boolean: true,
            null: null,
            array: [1, 2, 3],
            object: { nested: "value" },
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        data: {
          string: "hello",
          number: 42,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: "value" },
        },
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(true);
    });

    it("should not modify original object", async () => {
      const input = { name: "John", age: 30 };
      const original = JSON.parse(JSON.stringify(input));

      await node.execute({
        inputs: { json: input, path: "$.name", value: "Jane" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(input).toEqual(original);
    });

    it("should handle invalid path gracefully", async () => {
      const input = { name: "John" };
      const result = await node.execute({
        inputs: { json: input, path: "invalid-path", value: "new" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual(input);
      expect(result.outputs?.success).toBe(false);
      expect(result.outputs?.pathExists).toBe(false);
    });

    it("should handle array out of bounds", async () => {
      const input = { items: ["apple", "banana"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[5]", value: "cherry" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana", null, null, null, "cherry"],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(false);
    });

    it("should handle functions as values", async () => {
      const func = () => {};
      const input = { name: "John" };
      const result = await node.execute({
        inputs: { json: input, path: "$.handler", value: func },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John", handler: func });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(false);
    });

    it("should handle Date objects as values", async () => {
      const date = new Date();
      const input = { name: "John" };
      const result = await node.execute({
        inputs: { json: input, path: "$.created", value: date },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John", created: date });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.pathExists).toBe(false);
    });
  });
});
