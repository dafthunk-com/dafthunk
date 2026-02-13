import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JsonObjectKeysNode } from "./json-object-keys-node";

describe("JsonObjectKeysNode", () => {
  const nodeId = "json-object-keys";
  const node = new JsonObjectKeysNode({
    nodeId,
  } as unknown as Node);

  const createContext = (inputs: Record<string, any>): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      mode: "dev" as const,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  describe("execute", () => {
    it("should return empty array for null input", async () => {
      const result = await node.execute(
        createContext({
          object: null,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
    });

    it("should return empty array for undefined input", async () => {
      const result = await node.execute(
        createContext({
          object: undefined,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
    });

    it("should return empty array for string input", async () => {
      const result = await node.execute(
        createContext({
          object: "not an object",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
    });

    it("should return empty array for array input", async () => {
      const result = await node.execute(
        createContext({
          object: [1, 2, 3],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
    });

    it("should return empty array for empty object", async () => {
      const result = await node.execute(
        createContext({
          object: {},
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
    });

    it("should return keys for simple object", async () => {
      const result = await node.execute(
        createContext({
          object: { name: "John", age: 30, city: "New York" },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["name", "age", "city"]);
    });

    it("should return keys for complex object", async () => {
      const result = await node.execute(
        createContext({
          object: {
            string: "value",
            number: 42,
            boolean: true,
            null: null,
            array: [1, 2, 3],
            object: { nested: "value" },
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([
        "string",
        "number",
        "boolean",
        "null",
        "array",
        "object",
      ]);
    });

    it("should handle special characters in keys", async () => {
      const result = await node.execute(
        createContext({
          object: {
            "key-with-dashes": "value1",
            key_with_underscores: "value2",
            keyWithCamelCase: "value3",
            "key with spaces": "value4",
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([
        "key-with-dashes",
        "key_with_underscores",
        "keyWithCamelCase",
        "key with spaces",
      ]);
    });

    it("should handle numeric keys", async () => {
      const result = await node.execute(
        createContext({
          object: {
            "1": "one",
            "2": "two",
            "3": "three",
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["1", "2", "3"]);
    });

    it("should handle unicode characters in keys", async () => {
      const result = await node.execute(
        createContext({
          object: {
            café: "value1",
            über: "value2",
            ñoño: "value3",
            "🎉": "value4",
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["café", "über", "ñoño", "🎉"]);
    });

    it("should handle Record<string, any> type", async () => {
      const result = await node.execute(
        createContext({
          object: {} as Record<string, any>,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual([]);
    });

    it("should handle deeply nested object structure", async () => {
      const result = await node.execute(
        createContext({
          object: {
            user: {
              name: "John",
              age: 30,
            },
            settings: {
              theme: "dark",
              notifications: true,
            },
            metadata: {
              created: "2023-01-01",
              version: "1.0.0",
            },
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["user", "settings", "metadata"]);
    });

    it("should handle functions as values", async () => {
      const result = await node.execute(
        createContext({
          object: {
            func1: () => {},
            func2: function () {},
            method: () => {},
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["func1", "func2", "method"]);
    });

    it("should handle Date objects as values", async () => {
      const result = await node.execute(
        createContext({
          object: {
            date1: new Date("2023-01-01"),
            date2: new Date("2023-12-31"),
            date3: new Date(),
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.keys).toEqual(["date1", "date2", "date3"]);
    });
  });
});
