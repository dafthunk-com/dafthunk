import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonMergeNode } from "./json-merge-node";

describe("JsonMergeNode", () => {
  const nodeId = "json-merge";
  const node = new JsonMergeNode({
    nodeId,
  } as unknown as Node);

  const createContext = (inputs: Record<string, any>): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  describe("execute", () => {
    it("should handle null input", async () => {
      const result = await node.execute(
        createContext({
          objects: null,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
    });

    it("should handle string input", async () => {
      const result = await node.execute(
        createContext({
          objects: "not an array",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
    });

    it("should handle empty array", async () => {
      const result = await node.execute(
        createContext({
          objects: [],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
    });

    it("should merge simple objects", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { name: "John", age: 30 },
            { city: "New York", country: "USA" },
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
        country: "USA",
      });
    });

    it("should merge multiple objects", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { name: "John" },
            { age: 30 },
            { city: "New York" },
            { country: "USA" },
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
        country: "USA",
      });
    });

    it("should handle overlapping keys (last wins)", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { name: "John", age: 30 },
            { name: "Jane", city: "New York" },
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "Jane",
        age: 30,
        city: "New York",
      });
    });

    it("should handle null and undefined values", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { name: "John" },
            { age: 30 },
            { city: "New York" },
            null,
            undefined,
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
      });
    });

    it("should merge nested objects", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { user: { name: "John", age: 30 } },
            { user: { age: 31, city: "New York" } },
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          name: "John",
          age: 31,
          city: "New York",
        },
      });
    });

    it("should perform deep merge when deep is true", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { user: { name: "John", age: 30 } },
            { user: { age: 31, city: "New York" } },
          ],
          deep: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          name: "John",
          age: 31,
          city: "New York",
        },
      });
    });

    it("should perform shallow merge when deep is false", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { user: { name: "John", age: 30 } },
            { user: { age: 31, city: "New York" } },
          ],
          deep: false,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          age: 31,
          city: "New York",
        },
      });
    });

    it("should handle complex nested structures with deep merge", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            {
              user: {
                profile: { name: "John", theme: "dark" },
                settings: { notifications: true },
              },
            },
            {
              user: {
                profile: { age: 30, theme: "light" },
                settings: { autoSave: true },
              },
            },
          ],
          deep: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          profile: {
            name: "John",
            age: 30,
            theme: "light",
          },
          settings: {
            notifications: true,
            autoSave: true,
          },
        },
      });
    });

    it("should handle arrays in deep merge", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { items: ["apple", "banana"], tags: ["fruit"] },
            { items: ["cherry"], tags: ["red"] },
          ],
          deep: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["cherry"],
        tags: ["red"],
      });
    });

    it("should handle null values in deep merge", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { user: { name: "John", age: 30 } },
            { user: { name: null, city: "New York" } },
          ],
          deep: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          name: null,
          age: 30,
          city: "New York",
        },
      });
    });

    it("should handle mixed value types", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { string: "hello", number: 42 },
            { boolean: true, null: null },
            { array: [1, 2, 3], object: { nested: "value" } },
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        string: "hello",
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: "value" },
      });
    });

    it("should handle functions (shallow copy)", async () => {
      const handler1 = () => {};
      const handler2 = () => {};

      const result = await node.execute(
        createContext({
          objects: [{ handler1 }, { handler2 }],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        handler1,
        handler2,
      });
    });

    it("should handle Date objects", async () => {
      const created = new Date("2023-01-01");
      const updated = new Date("2023-12-31");

      const result = await node.execute(
        createContext({
          objects: [{ created }, { updated }],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        created,
        updated,
      });
    });

    it("should handle objects with numeric keys", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            { "1": "one", "2": "two" },
            { "3": "three", "4": "four" },
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        "1": "one",
        "2": "two",
        "3": "three",
        "4": "four",
      });
    });

    it("should handle mixed array and object inputs", async () => {
      const result = await node.execute(
        createContext({
          objects: [
            "string",
            42,
            true,
            { name: "John" },
            { age: 30 },
            { city: "New York" },
            null,
            undefined,
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
      });
    });
  });
});
