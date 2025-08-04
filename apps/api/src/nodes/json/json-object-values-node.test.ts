import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonObjectValuesNode } from "./json-object-values-node";

describe("JsonObjectValuesNode", () => {
  const nodeId = "json-object-values";
  const node = new JsonObjectValuesNode({
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
      expect(result.outputs?.values).toEqual([]);
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
      expect(result.outputs?.values).toEqual([]);
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
      expect(result.outputs?.values).toEqual([]);
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
      expect(result.outputs?.values).toEqual([]);
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
      expect(result.outputs?.values).toEqual([]);
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for simple object", async () => {
      const result = await node.execute({
        inputs: { object: { name: "John", age: 30, city: "New York" } },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual(["John", 30, "New York"]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for object with mixed value types", async () => {
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
      expect(result.outputs?.values).toEqual([
        "hello",
        42,
        true,
        null,
        [1, 2, 3],
        { nested: "value" },
      ]);
      expect(result.outputs?.count).toBe(6);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for object with special characters in values", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            key1: "value-with-dashes",
            key2: "value_with_underscores",
            key3: "value with spaces",
            key4: "valueWithCamelCase",
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([
        "value-with-dashes",
        "value_with_underscores",
        "value with spaces",
        "valueWithCamelCase",
      ]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for object with numeric values", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            one: 1,
            two: 2,
            three: 3,
            float: 3.14,
            negative: -42,
            zero: 0,
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([1, 2, 3, 3.14, -42, 0]);
      expect(result.outputs?.count).toBe(6);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for object with unicode characters in values", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            key1: "café",
            key2: "über",
            key3: "ñoño",
            key4: "🎉",
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual(["café", "über", "ñoño", "🎉"]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for large object", async () => {
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
      expect(result.outputs?.values).toHaveLength(100);
      expect(result.outputs?.count).toBe(100);
      expect(result.outputs?.isObject).toBe(true);
      expect(result.outputs?.values[0]).toBe("value0");
      expect(result.outputs?.values[99]).toBe("value99");
    });

    it("should return values for object with nested objects", async () => {
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
      expect(result.outputs?.values).toEqual([
        { name: "John", age: 30 },
        { theme: "dark", notifications: true },
        { created: "2023-01-01", version: "1.0.0" },
      ]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for object with functions", async () => {
      const func1 = () => {};
      const func2 = function () {};
      const method = function test() {};

      const result = await node.execute({
        inputs: {
          object: {
            func1,
            func2,
            method,
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([func1, func2, method]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for object with Date objects", async () => {
      const date1 = new Date();
      const date2 = new Date("2023-01-01");
      const date3 = new Date("2023-12-31");

      const result = await node.execute({
        inputs: {
          object: {
            date1,
            date2,
            date3,
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([date1, date2, date3]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for object with arrays", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            numbers: [1, 2, 3, 4, 5],
            strings: ["apple", "banana", "cherry"],
            mixed: [1, "two", true, null, { key: "value" }],
            nested: [
              [1, 2],
              [3, 4],
              [5, 6],
            ],
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([
        [1, 2, 3, 4, 5],
        ["apple", "banana", "cherry"],
        [1, "two", true, null, { key: "value" }],
        [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      ]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for object with boolean values", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            true1: true,
            false1: false,
            true2: true,
            false2: false,
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([true, false, true, false]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return values for object with null and undefined values", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            null1: null,
            null2: null,
            undefined1: undefined,
            undefined2: undefined,
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.values).toEqual([
        null,
        null,
        undefined,
        undefined,
      ]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });
  });
});
