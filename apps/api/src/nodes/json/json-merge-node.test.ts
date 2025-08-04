import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonMergeNode } from "./json-merge-node";

describe("JsonMergeNode", () => {
  const nodeId = "json-merge";
  const node = new JsonMergeNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should return empty object for null input", async () => {
      const result = await node.execute({
        inputs: { objects: null },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.success).toBe(false);
    });

    it("should return empty object for non-array input", async () => {
      const result = await node.execute({
        inputs: { objects: "not an array" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.success).toBe(false);
    });

    it("should return empty object for empty array", async () => {
      const result = await node.execute({
        inputs: { objects: [] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
      expect(result.outputs?.count).toBe(0);
      expect(result.outputs?.success).toBe(true);
    });

    it("should merge two simple objects", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { name: "John", age: 30 },
            { city: "New York", country: "USA" },
          ],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
        country: "USA",
      });
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should merge multiple objects", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { name: "John" },
            { age: 30 },
            { city: "New York" },
            { country: "USA" },
          ],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
        country: "USA",
      });
      expect(result.outputs?.count).toBe(4);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle conflicting keys (last wins)", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { name: "John", age: 25 },
            { name: "Jane", age: 30 },
            { name: "Bob", city: "Boston" },
          ],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "Bob",
        age: 30,
        city: "Boston",
      });
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.success).toBe(true);
    });

    it("should filter out null and undefined objects", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { name: "John" },
            null,
            { age: 30 },
            undefined,
            { city: "New York" },
          ],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
      });
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.success).toBe(true);
    });

    it("should perform shallow merge by default", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { user: { name: "John", age: 25 } },
            { user: { age: 30, city: "New York" } },
          ],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: { age: 30, city: "New York" },
      });
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should perform deep merge when deep=true", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { user: { name: "John", age: 25 } },
            { user: { age: 30, city: "New York" } },
          ],
          deep: true,
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: { name: "John", age: 30, city: "New York" },
      });
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should perform shallow merge when deep=false", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { user: { name: "John", age: 25 } },
            { user: { age: 30, city: "New York" } },
          ],
          deep: false,
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: { age: 30, city: "New York" },
      });
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle complex nested deep merge", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            {
              user: {
                profile: { name: "John", theme: "light" },
                settings: { notifications: true },
              },
            },
            {
              user: {
                profile: { age: 30, theme: "dark" },
                settings: { autoSave: true },
              },
            },
          ],
          deep: true,
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          profile: { name: "John", age: 30, theme: "dark" },
          settings: { notifications: true, autoSave: true },
        },
      });
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle arrays in deep merge (replace arrays)", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { items: ["apple", "banana"], tags: ["fruit"] },
            { items: ["cherry", "orange"], tags: ["citrus"] },
          ],
          deep: true,
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["cherry", "orange"],
        tags: ["citrus"],
      });
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should skip null/undefined values in deep merge", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { user: { name: "John", age: 30 } },
            { user: { name: null, city: "New York" } },
          ],
          deep: true,
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: { name: "John", age: 30, city: "New York" },
      });
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle mixed value types", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { string: "hello", number: 42 },
            { boolean: true, null: null },
            { array: [1, 2, 3], object: { nested: "value" } },
          ],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        string: "hello",
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: "value" },
      });
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle functions as values", async () => {
      const func1 = () => {};
      const func2 = function () {};
      const result = await node.execute({
        inputs: {
          objects: [{ handler1: func1 }, { handler2: func2 }],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        handler1: func1,
        handler2: func2,
      });
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle Date objects as values", async () => {
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-12-31");
      const result = await node.execute({
        inputs: {
          objects: [{ created: date1 }, { updated: date2 }],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        created: date1,
        updated: date2,
      });
      expect(result.outputs?.count).toBe(2);
      expect(result.outputs?.success).toBe(true);
    });

    it("should handle large number of objects", async () => {
      const objects = [];
      for (let i = 0; i < 10; i++) {
        objects.push({ [`key${i}`]: `value${i}` });
      }

      const result = await node.execute({
        inputs: { objects },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.count).toBe(10);
      expect(result.outputs?.success).toBe(true);

      for (let i = 0; i < 10; i++) {
        expect(result.outputs?.result[`key${i}`]).toBe(`value${i}`);
      }
    });

    it("should handle non-object values in array", async () => {
      const result = await node.execute({
        inputs: {
          objects: [
            { name: "John" },
            "not an object",
            { age: 30 },
            42,
            { city: "New York" },
            true,
            null,
            undefined,
          ],
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
      });
      expect(result.outputs?.count).toBe(3);
      expect(result.outputs?.success).toBe(true);
    });
  });
});
