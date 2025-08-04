import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonReplaceNode } from "./json-replace-node";

describe("JsonReplaceNode", () => {
  const nodeId = "json-replace";
  const node = new JsonReplaceNode({
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
      expect(result.outputs?.replaced).toBe(false);
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
      expect(result.outputs?.replaced).toBe(false);
    });

    it("should replace value when path exists", async () => {
      const input = { name: "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: "$.name", value: "Jane" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "Jane", age: 30 });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.replaced).toBe(true);
    });

    it("should not replace value when path doesn't exist", async () => {
      const input = { name: "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: "$.city", value: "New York" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John", age: 30 });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.replaced).toBe(false);
    });

    it("should replace nested value when path exists", async () => {
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
      expect(result.outputs?.replaced).toBe(true);
    });

    it("should not replace nested value when path doesn't exist", async () => {
      const input = { user: { name: "John" } };
      const result = await node.execute({
        inputs: { json: input, path: "$.user.age", value: 30 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ user: { name: "John" } });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.replaced).toBe(false);
    });

    it("should replace array element when index exists", async () => {
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
      expect(result.outputs?.replaced).toBe(true);
    });

    it("should not replace array element when index doesn't exist", async () => {
      const input = { items: ["apple", "banana"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[5]", value: "cherry" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ items: ["apple", "banana"] });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.replaced).toBe(false);
    });

    it("should handle quoted property names", async () => {
      const input = { "user-name": "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: '$["user-name"]', value: "Jane" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ "user-name": "Jane", age: 30 });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.replaced).toBe(true);
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

    it("should handle complex nested replacement", async () => {
      const input = {
        users: [
          {
            name: "John",
            profile: {
              theme: "light",
              notifications: true,
              settings: { autoSave: true },
            },
          },
        ],
      };
      const result = await node.execute({
        inputs: {
          json: input,
          path: "$.users[0].profile.theme",
          value: "dark",
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        users: [
          {
            name: "John",
            profile: {
              theme: "dark",
              notifications: true,
              settings: { autoSave: true },
            },
          },
        ],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.replaced).toBe(true);
    });

    it("should handle mixed value types", async () => {
      const input = { data: { string: "old", number: 10 } };
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
      expect(result.outputs?.replaced).toBe(true);
    });

    it("should handle functions as values", async () => {
      const func = () => {};
      const input = { name: "John", handler: () => {} };
      const result = await node.execute({
        inputs: { json: input, path: "$.handler", value: func },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John", handler: func });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.replaced).toBe(true);
    });

    it("should handle Date objects as values", async () => {
      const date = new Date();
      const input = { name: "John", created: new Date("2023-01-01") };
      const result = await node.execute({
        inputs: { json: input, path: "$.created", value: date },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John", created: date });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.replaced).toBe(true);
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
      expect(result.outputs?.replaced).toBe(false);
    });

    it("should handle negative array indices", async () => {
      const input = { items: ["apple", "banana", "cherry"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[-1]", value: "orange" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana", "cherry"],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.replaced).toBe(false);
    });
  });
});
