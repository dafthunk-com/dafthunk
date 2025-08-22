import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonSetNode } from "./json-set-node";

describe("JsonSetNode", () => {
  const nodeId = "json-set";
  const node = new JsonSetNode({
    nodeId,
  } as unknown as Node);

  const createContext = (inputs: Record<string, any>): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      env: {},
    }) as unknown as NodeContext;

  describe("execute", () => {
    it("should handle null input", async () => {
      const result = await node.execute(
        createContext({
          json: null,
          path: "$.newField",
          value: "test value",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        newField: "test value",
      });
    });

    it("should set string value at root level", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "$.city",
          value: "New York",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
      });
    });

    it("should update existing field", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "$.age",
          value: 31,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 31,
      });
    });

    it("should set nested field", async () => {
      const result = await node.execute(
        createContext({
          json: { user: { name: "John" } },
          path: "$.user.age",
          value: 30,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          name: "John",
          age: 30,
        },
      });
    });

    it("should set array element", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry"] },
          path: "$.items[1]",
          value: "orange",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "orange", "cherry"],
      });
    });

    it("should set deeply nested field", async () => {
      const result = await node.execute(
        createContext({
          json: { data: { items: ["apple", "banana"] } },
          path: "$.data.items[2]",
          value: "cherry",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        data: {
          items: ["apple", "banana", "cherry"],
        },
      });
    });

    it("should set number value", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John" },
          path: "$.age",
          value: 30,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
      });
    });

    it("should set boolean value", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John" },
          path: "$.active",
          value: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        active: true,
      });
    });

    it("should set null value", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "$.age",
          value: null,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: null,
      });
    });

    it("should set object value", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John" },
          path: "$.address",
          value: { street: "123 Main St", city: "New York" },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        address: {
          street: "123 Main St",
          city: "New York",
        },
      });
    });

    it("should set array value", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John" },
          path: "$.hobbies",
          value: ["reading", "swimming"],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        hobbies: ["reading", "swimming"],
      });
    });

    it("should handle empty object", async () => {
      const result = await node.execute(
        createContext({
          json: {},
          path: "$.newField",
          value: "test value",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        newField: "test value",
      });
    });

    it("should handle quoted property names", async () => {
      const result = await node.execute(
        createContext({
          json: { "user-name": "John" },
          path: "$.user-name",
          value: "Jane",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        "user-name": "Jane",
      });
    });

    it("should handle complex nested structure", async () => {
      const result = await node.execute(
        createContext({
          json: { data: {} },
          path: "$.data.complex",
          value: {
            string: "test",
            number: 42,
            boolean: true,
            null: null,
            array: [1, 2, 3],
            object: { nested: "value" },
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        data: {
          complex: {
            string: "test",
            number: 42,
            boolean: true,
            null: null,
            array: [1, 2, 3],
            object: { nested: "value" },
          },
        },
      });
    });

    it("should handle function value", async () => {
      const handler = () => {};
      const result = await node.execute(
        createContext({
          json: { name: "John" },
          path: "$.handler",
          value: handler,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        handler,
      });
    });

    it("should handle Date value", async () => {
      const date = new Date("2024-01-01");
      const result = await node.execute(
        createContext({
          json: { name: "John" },
          path: "$.created",
          value: date,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        created: date,
      });
    });

    it("should handle simple path", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "city",
          value: "New York",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        city: "New York",
      });
    });

    it("should handle array with multiple elements", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry"] },
          path: "$.items[3]",
          value: "orange",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana", "cherry", "orange"],
      });
    });
  });
});
