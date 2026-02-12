import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { JsonRemoveNode } from "./json-remove-node";

describe("JsonRemoveNode", () => {
  const nodeId = "json-remove";
  const node = new JsonRemoveNode({
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
          path: "$.test",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBeNull();
    });

    it("should remove field at root level", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "$.age",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
      });
    });

    it("should remove multiple fields", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30, city: "New York" },
          path: "$.age",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        city: "New York",
      });
    });

    it("should remove nested field", async () => {
      const result = await node.execute(
        createContext({
          json: { user: { name: "John", age: 30 } },
          path: "$.user.age",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          name: "John",
        },
      });
    });

    it("should remove deeply nested field", async () => {
      const result = await node.execute(
        createContext({
          json: { user: { name: "John" } },
          path: "$.user.name",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {},
      });
    });

    it("should remove array element", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry"] },
          path: "$.items[1]",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "cherry"],
      });
    });

    it("should remove last array element", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry"] },
          path: "$.items[2]",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana"],
      });
    });

    it("should handle quoted property names", async () => {
      const result = await node.execute(
        createContext({
          json: { "user-name": "John", age: 30 },
          path: "$.user-name",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        age: 30,
      });
    });

    it("should handle non-existent path", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "$.nonexistent",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
      });
    });

    it("should handle complex nested structure", async () => {
      const result = await node.execute(
        createContext({
          json: {
            users: [
              {
                name: "John",
                profile: {
                  theme: "dark",
                  notifications: true,
                  settings: {
                    autoSave: true,
                  },
                },
              },
            ],
          },
          path: "$.users[0].profile.settings",
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
        ],
      });
    });

    it("should handle any type input", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30, city: "New York", country: "USA" },
          path: "$.city",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        country: "USA",
      });
    });

    it("should handle array with multiple elements", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry", "orange"] },
          path: "$.items[1]",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "cherry", "orange"],
      });
    });

    it("should handle simple path", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "age",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
      });
    });

    it("should handle array index out of bounds", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana"] },
          path: "$.items[5]",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana"],
      });
    });

    it("should handle negative array index", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry"] },
          path: "$.items[-1]",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana"],
      });
    });
  });
});
