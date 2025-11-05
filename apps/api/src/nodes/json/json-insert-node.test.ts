import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonInsertNode } from "./json-insert-node";

describe("JsonInsertNode", () => {
  const nodeId = "json-insert";
  const node = new JsonInsertNode({
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

    it("should insert string value at root level", async () => {
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

    it("should insert number value at root level", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John" },
          path: "$.age",
          value: 25,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 25,
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

    it("should insert nested field", async () => {
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

    it("should insert deeply nested field", async () => {
      const result = await node.execute(
        createContext({
          json: { user: { name: "John", age: 30 } },
          path: "$.user.address.city",
          value: "New York",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          name: "John",
          age: 30,
          address: {
            city: "New York",
          },
        },
      });
    });

    it("should insert into array at index", async () => {
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

    it("should append to array", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana"] },
          path: "$.items[2]",
          value: "cherry",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana", "cherry"],
      });
    });

    it("should insert at root level with simple path", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John" },
          path: "newField",
          value: "test value",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        newField: "test value",
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

    it("should insert into nested array", async () => {
      const result = await node.execute(
        createContext({
          json: {
            users: [
              { name: "John", profile: { theme: "dark" } },
              { name: "Jane", profile: { theme: "light" } },
            ],
          },
          path: "$.users[0].profile.notifications",
          value: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        users: [
          {
            name: "John",
            profile: {
              theme: "dark",
              notifications: true,
            },
          },
          {
            name: "Jane",
            profile: {
              theme: "light",
            },
          },
        ],
      });
    });

    it("should insert complex object", async () => {
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
  });
});
