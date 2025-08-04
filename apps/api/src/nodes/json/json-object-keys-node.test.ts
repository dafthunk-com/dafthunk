import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonObjectKeysNode } from "./json-object-keys-node";

describe("JsonObjectKeysNode", () => {
  const nodeId = "json-object-keys";
  const node = new JsonObjectKeysNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should return empty array for null input", async () => {
      const result = await node.execute({
        inputs: { object: null },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.isObject).toBe(false);
    });

    it("should return empty array for undefined input", async () => {
      const result = await node.execute({
        inputs: { object: undefined },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.isObject).toBe(false);
    });

    it("should return empty array for non-object input", async () => {
      const result = await node.execute({
        inputs: { object: "not an object" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.isObject).toBe(false);
    });

    it("should return empty array for array input", async () => {
      const result = await node.execute({
        inputs: { object: [1, 2, 3] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.isObject).toBe(false);
    });

    it("should return empty array for empty object", async () => {
      const result = await node.execute({
        inputs: { object: {} },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return keys for simple object", async () => {
      const result = await node.execute({
        inputs: { object: { name: "John", age: 30, city: "New York" } },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["name", "age", "city"]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return keys for object with mixed value types", async () => {
      const result = await node.execute({
        inputs: {
          object: {
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
      expect(result.outputs?.keys).toEqual([
        "string",
        "number",
        "boolean",
        "null",
        "array",
        "object",
      ]);
      expect(result.outputs?.count).toBe(6);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return keys for object with special characters in keys", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            "key-with-dashes": "value1",
            key_with_underscores: "value2",
            keyWithCamelCase: "value3",
            "key with spaces": "value4",
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([
        "key-with-dashes",
        "key_with_underscores",
        "keyWithCamelCase",
        "key with spaces",
      ]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return keys for object with numeric keys", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            "1": "one",
            "2": "two",
            "3": "three",
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["1", "2", "3"]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return keys for object with unicode characters in keys", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            café: "value1",
            über: "value2",
            ñoño: "value3",
            "🎉": "value4",
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["café", "über", "ñoño", "🎉"]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return keys for large object", async () => {
      const largeObject: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }

      const result = await node.execute({
        inputs: { object: largeObject },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toHaveLength(100);
      expect(result.outputs?.count).toBe(100);
      expect(result.outputs?.isObject).toBe(true);
      expect(result.outputs?.keys[0]).toBe("key0");
      expect(result.outputs?.keys[99]).toBe("key99");
    });

    it("should return keys for object with nested objects", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            user: { name: "John", age: 30 },
            settings: { theme: "dark", notifications: true },
            metadata: { created: "2023-01-01", version: "1.0.0" },
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["user", "settings", "metadata"]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return keys for object with functions (functions are objects)", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            func1: () => {},
            func2: function () {},
            method: function test() {},
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["func1", "func2", "method"]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return keys for object with Date objects", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            date1: new Date(),
            date2: new Date("2023-01-01"),
            date3: new Date("2023-12-31"),
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["date1", "date2", "date3"]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });
  });
});
