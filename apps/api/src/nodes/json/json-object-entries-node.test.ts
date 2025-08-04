import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonObjectEntriesNode } from "./json-object-entries-node";

describe("JsonObjectEntriesNode", () => {
  const nodeId = "json-object-entries";
  const node = new JsonObjectEntriesNode({
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
      expect(result.outputs?.entries).toEqual([]);
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
      expect(result.outputs?.entries).toEqual([]);
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
      expect(result.outputs?.entries).toEqual([]);
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
      expect(result.outputs?.entries).toEqual([]);
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
      expect(result.outputs?.entries).toEqual([]);
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for simple object", async () => {
      const result = await node.execute({
        inputs: { object: { name: "John", age: 30, city: "New York" } },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.entries).toEqual([
        ["name", "John"],
        ["age", 30],
        ["city", "New York"],
      ]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with mixed value types", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["string", "hello"],
        ["number", 42],
        ["boolean", true],
        ["null", null],
        ["array", [1, 2, 3]],
        ["object", { nested: "value" }],
      ]);
      expect(result.outputs?.count).toBe(6);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with special characters in keys", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["key-with-dashes", "value1"],
        ["key_with_underscores", "value2"],
        ["keyWithCamelCase", "value3"],
        ["key with spaces", "value4"],
      ]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with numeric keys", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["1", "one"],
        ["2", "two"],
        ["3", "three"],
      ]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with unicode characters", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["café", "value1"],
        ["über", "value2"],
        ["ñoño", "value3"],
        ["🎉", "value4"],
      ]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for large object", async () => {
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
      expect(result.outputs?.entries).toHaveLength(100);
      expect(result.outputs?.count).toBe(100);
      expect(result.outputs?.isObject).toBe(true);
      expect(result.outputs?.entries[0]).toEqual(["key0", "value0"]);
      expect(result.outputs?.entries[99]).toEqual(["key99", "value99"]);
    });

    it("should return entries for object with nested objects", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["user", { name: "John", age: 30 }],
        ["settings", { theme: "dark", notifications: true }],
        ["metadata", { created: "2023-01-01", version: "1.0.0" }],
      ]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with functions", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["func1", func1],
        ["func2", func2],
        ["method", method],
      ]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with Date objects", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["date1", date1],
        ["date2", date2],
        ["date3", date3],
      ]);
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with arrays", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["numbers", [1, 2, 3, 4, 5]],
        ["strings", ["apple", "banana", "cherry"]],
        ["mixed", [1, "two", true, null, { key: "value" }]],
        [
          "nested",
          [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
        ],
      ]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with boolean values", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["true1", true],
        ["false1", false],
        ["true2", true],
        ["false2", false],
      ]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with null and undefined values", async () => {
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
      expect(result.outputs?.entries).toEqual([
        ["null1", null],
        ["null2", null],
        ["undefined1", undefined],
        ["undefined2", undefined],
      ]);
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.isObject).toBe(true);
    });

    it("should return entries for object with complex nested structures", async () => {
      const result = await node.execute({
        inputs: {
          object: {
            user: {
              profile: {
                name: "John",
                preferences: {
                  theme: "dark",
                  language: "en",
                },
              },
              permissions: ["read", "write", "admin"],
            },
            system: {
              version: "1.0.0",
              features: {
                enabled: true,
                modules: ["auth", "api", "ui"],
              },
            },
          },
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.entries).toHaveLength(2);
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.isObject).toBe(true);

      // Check first entry
      expect(result.outputs?.entries[0][0]).toBe("user");
      expect(result.outputs?.entries[0][1]).toEqual({
        profile: {
          name: "John",
          preferences: {
            theme: "dark",
            language: "en",
          },
        },
        permissions: ["read", "write", "admin"],
      });

      // Check second entry
      expect(result.outputs?.entries[1][0]).toBe("system");
      expect(result.outputs?.entries[1][1]).toEqual({
        version: "1.0.0",
        features: {
          enabled: true,
          modules: ["auth", "api", "ui"],
        },
      });
    });
  });
});
