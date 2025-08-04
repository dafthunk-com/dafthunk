import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonInsertNode } from "./json-insert-node";

describe("JsonInsertNode", () => {
  const nodeId = "json-insert";
  const node = new JsonInsertNode({
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
      expect(result.outputs?.inserted).toBe(false);
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
      expect(result.outputs?.inserted).toBe(false);
    });

    it("should insert value when path doesn't exist", async () => {
      const input = { name: "John" };
      const result = await node.execute({
        inputs: { json: input, path: "$.age", value: 30 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John", age: 30 });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(true);
    });

    it("should not insert value when path exists", async () => {
      const input = { name: "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: "$.name", value: "Jane" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John", age: 30 });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(false);
    });

    it("should insert at nested path when it doesn't exist", async () => {
      const input = { user: { name: "John" } };
      const result = await node.execute({
        inputs: { json: input, path: "$.user.age", value: 30 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: { name: "John", age: 30 },
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(true);
    });

    it("should not insert at nested path when it exists", async () => {
      const input = { user: { name: "John", age: 30 } };
      const result = await node.execute({
        inputs: { json: input, path: "$.user.name", value: "Jane" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: { name: "John", age: 30 },
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(false);
    });

    it("should insert at array index when it doesn't exist", async () => {
      const input = { items: ["apple", "banana"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[3]", value: "cherry" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana", null, "cherry"],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(true);
    });

    it("should not insert at array index when it exists", async () => {
      const input = { items: ["apple", "banana", "cherry"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[1]", value: "orange" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana", "cherry"],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(false);
    });

    it("should create nested path structure for insertion", async () => {
      const input = { name: "John" };
      const result = await node.execute({
        inputs: {
          json: input,
          path: "$.user.profile.settings.theme",
          value: "dark",
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        user: {
          profile: {
            settings: {
              theme: "dark",
            },
          },
        },
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(true);
    });

    it("should handle quoted property names", async () => {
      const input = {};
      const result = await node.execute({
        inputs: { json: input, path: '$["user-name"]', value: "John" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ "user-name": "John" });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(true);
    });

    it("should not modify original object", async () => {
      const input = { name: "John" };
      const original = JSON.parse(JSON.stringify(input));

      await node.execute({
        inputs: { json: input, path: "$.age", value: 30 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(input).toEqual(original);
    });

    it("should handle complex nested structures", async () => {
      const input = {
        users: [{ name: "John", profile: { theme: "light" } }],
      };
      const result = await node.execute({
        inputs: {
          json: input,
          path: "$.users[0].profile.notifications",
          value: true,
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
              theme: "light",
              notifications: true,
            },
          },
        ],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(true);
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
        data: {},
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.inserted).toBe(false);
    });
  });
});
