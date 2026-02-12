import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { JsonObjectValuesNode } from "./json-object-values-node";

describe("JsonObjectValuesNode", () => {
  const nodeId = "json-object-values";
  const node = new JsonObjectValuesNode({
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
      expect(result.outputs?.values).toEqual([]);
    });

    it("should return empty array for undefined input", async () => {
      const result = await node.execute(
        createContext({
          object: undefined,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([]);
    });

    it("should return empty array for string input", async () => {
      const result = await node.execute(
        createContext({
          object: "not an object",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([]);
    });

    it("should return empty array for array input", async () => {
      const result = await node.execute(
        createContext({
          object: [1, 2, 3],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([]);
    });

    it("should return empty array for empty object", async () => {
      const result = await node.execute(
        createContext({
          object: {},
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([]);
    });

    it("should return values for simple object", async () => {
      const result = await node.execute(
        createContext({
          object: { name: "John", age: 30, city: "New York" },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual(["John", 30, "New York"]);
    });

    it("should return values for complex object", async () => {
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
      expect(result.outputs?.values).toEqual([
        "value",
        42,
        true,
        null,
        [1, 2, 3],
        { nested: "value" },
      ]);
    });

    it("should handle string values", async () => {
      const result = await node.execute(
        createContext({
          object: {
            key1: "value1",
            key2: "value2",
            key3: "value3",
            key4: "value4",
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([
        "value1",
        "value2",
        "value3",
        "value4",
      ]);
    });

    it("should handle numeric values", async () => {
      const result = await node.execute(
        createContext({
          object: {
            one: 1,
            two: 2,
            three: 3,
            float: 3.14,
            negative: -5,
            zero: 0,
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([1, 2, 3, 3.14, -5, 0]);
    });

    it("should handle mixed value types", async () => {
      const result = await node.execute(
        createContext({
          object: {
            key1: "string",
            key2: "value",
            key3: "test",
            key4: "data",
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([
        "string",
        "value",
        "test",
        "data",
      ]);
    });

    it("should handle Record<string, any> type", async () => {
      const result = await node.execute(
        createContext({
          object: {} as Record<string, any>,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([]);
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
      expect(result.outputs?.values).toEqual([
        {
          name: "John",
          age: 30,
        },
        {
          theme: "dark",
          notifications: true,
        },
        {
          created: "2023-01-01",
          version: "1.0.0",
        },
      ]);
    });

    it("should handle functions as values", async () => {
      const func1 = () => {};
      const func2 = () => {};
      const method = () => {};

      const result = await node.execute(
        createContext({
          object: {
            func1,
            func2,
            method,
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([func1, func2, method]);
    });

    it("should handle Date objects as values", async () => {
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-12-31");
      const date3 = new Date();

      const result = await node.execute(
        createContext({
          object: {
            date1,
            date2,
            date3,
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([date1, date2, date3]);
    });

    it("should handle arrays as values", async () => {
      const result = await node.execute(
        createContext({
          object: {
            numbers: [1, 2, 3, 4, 5],
            strings: ["a", "b", "c"],
            mixed: ["string", 42, true, { key: "value" }, null],
            nested: [
              [1, 2],
              [3, 4],
              [5, 6],
            ],
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([
        [1, 2, 3, 4, 5],
        ["a", "b", "c"],
        ["string", 42, true, { key: "value" }, null],
        [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      ]);
    });

    it("should handle boolean values", async () => {
      const result = await node.execute(
        createContext({
          object: {
            true1: true,
            false1: false,
            true2: true,
            false2: false,
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([true, false, true, false]);
    });

    it("should handle null and undefined values", async () => {
      const result = await node.execute(
        createContext({
          object: {
            null1: null,
            null2: null,
            undefined1: undefined,
            undefined2: undefined,
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([
        null,
        null,
        undefined,
        undefined,
      ]);
    });
  });
});
