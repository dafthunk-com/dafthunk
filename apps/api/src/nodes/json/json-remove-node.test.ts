import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonRemoveNode } from "./json-remove-node";

describe("JsonRemoveNode", () => {
  const nodeId = "json-remove";
  const node = new JsonRemoveNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should return null for null input", async () => {
      const result = await node.execute({
        inputs: { json: null, path: "$.test" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBeNull();
      expect(result.outputs?.success).toBe(false);
      expect(result.outputs?.removed).toBe(false);
    });

    it("should return original for empty path", async () => {
      const input = { name: "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: "" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual(input);
      expect(result.outputs?.success).toBe(false);
      expect(result.outputs?.removed).toBe(false);
    });

    it("should remove value when path exists", async () => {
      const input = { name: "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: "$.age" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John" });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(true);
    });

    it("should not remove value when path doesn't exist", async () => {
      const input = { name: "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: "$.city" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ name: "John", age: 30 });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(false);
    });

    it("should remove nested value when path exists", async () => {
      const input = { user: { name: "John", age: 30 } };
      const result = await node.execute({
        inputs: { json: input, path: "$.user.age" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ user: { name: "John" } });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(true);
    });

    it("should not remove nested value when path doesn't exist", async () => {
      const input = { user: { name: "John" } };
      const result = await node.execute({
        inputs: { json: input, path: "$.user.age" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ user: { name: "John" } });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(false);
    });

    it("should remove array element when index exists", async () => {
      const input = { items: ["apple", "banana", "cherry"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[1]" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ items: ["apple", "cherry"] });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(true);
    });

    it("should not remove array element when index doesn't exist", async () => {
      const input = { items: ["apple", "banana"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[5]" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ items: ["apple", "banana"] });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(false);
    });

    it("should handle quoted property names", async () => {
      const input = { "user-name": "John", age: 30 };
      const result = await node.execute({
        inputs: { json: input, path: '$["user-name"]' },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ age: 30 });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(true);
    });

    it("should not modify original object", async () => {
      const input = { name: "John", age: 30 };
      const original = JSON.parse(JSON.stringify(input));

      await node.execute({
        inputs: { json: input, path: "$.age" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(input).toEqual(original);
    });

    it("should handle complex nested removal", async () => {
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
          path: "$.users[0].profile.notifications",
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
              settings: { autoSave: true },
            },
          },
        ],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(true);
    });

    it("should handle multiple removals", async () => {
      const input = {
        name: "John",
        age: 30,
        city: "New York",
        country: "USA",
      };

      // Remove multiple properties
      let result = await node.execute({
        inputs: { json: input, path: "$.age" },
        nodeId: "test",
        workflowId: "test",
      });

      result = await node.execute({
        inputs: { json: result.outputs?.result, path: "$.city" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        country: "USA",
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(true);
    });

    it("should handle array with single element removal", async () => {
      const input = { items: ["apple"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[0]" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({ items: [] });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(true);
    });

    it("should handle invalid path gracefully", async () => {
      const input = { name: "John" };
      const result = await node.execute({
        inputs: { json: input, path: "invalid-path" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual(input);
      expect(result.outputs?.success).toBe(false);
      expect(result.outputs?.removed).toBe(false);
    });

    it("should handle negative array indices", async () => {
      const input = { items: ["apple", "banana", "cherry"] };
      const result = await node.execute({
        inputs: { json: input, path: "$.items[-1]" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana", "cherry"],
      });
      expect(result.outputs?.success).toBe(true);
      expect(result.outputs?.removed).toBe(false);
    });
  });
});
