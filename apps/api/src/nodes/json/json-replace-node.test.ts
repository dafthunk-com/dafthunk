import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JsonReplaceNode } from "./json-replace-node";

describe("JsonReplaceNode", () => {
  const nodeId = "json-replace";
  const node = new JsonReplaceNode({
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

    it("should replace string value at root level", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "$.name",
          value: "Jane",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "Jane",
        age: 30,
      });
    });

    it("should replace number value at root level", async () => {
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

    it("should replace nested field", async () => {
      const result = await node.execute(
        createContext({
          json: { user: { name: "John", age: 30 } },
          path: "$.user.name",
          value: "Jane",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        user: {
          name: "Jane",
          age: 30,
        },
      });
    });

    it("should replace array element", async () => {
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

    it("should replace last array element", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry"] },
          path: "$.items[2]",
          value: "orange",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "banana", "orange"],
      });
    });

    it("should handle quoted property names", async () => {
      const result = await node.execute(
        createContext({
          json: { "user-name": "John", age: 30 },
          path: "$.user-name",
          value: "Jane",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        "user-name": "Jane",
        age: 30,
      });
    });

    it("should handle non-existent path", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "$.nonexistent",
          value: "test",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        age: 30,
        nonexistent: "test",
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
          path: "$.users[0].profile.theme",
          value: "light",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        users: [
          {
            name: "John",
            profile: {
              theme: "light",
              notifications: true,
              settings: {
                autoSave: true,
              },
            },
          },
        ],
      });
    });

    it("should handle complex value replacement", async () => {
      const result = await node.execute(
        createContext({
          json: { data: { string: "old", number: 42 } },
          path: "$.data",
          value: {
            string: "new",
            number: 100,
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
          string: "new",
          number: 100,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: "value" },
        },
      });
    });

    it("should handle function replacement", async () => {
      const newHandler = () => {};
      const result = await node.execute(
        createContext({
          json: { name: "John", handler: () => {} },
          path: "$.handler",
          value: newHandler,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        handler: newHandler,
      });
    });

    it("should handle Date replacement", async () => {
      const newDate = new Date("2024-01-01");
      const result = await node.execute(
        createContext({
          json: { name: "John", created: new Date("2023-01-01") },
          path: "$.created",
          value: newDate,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "John",
        created: newDate,
      });
    });

    it("should handle simple path", async () => {
      const result = await node.execute(
        createContext({
          json: { name: "John", age: 30 },
          path: "name",
          value: "Jane",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        name: "Jane",
        age: 30,
      });
    });

    it("should handle array with multiple elements", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry", "orange"] },
          path: "$.items[1]",
          value: "grape",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: ["apple", "grape", "cherry", "orange"],
      });
    });
  });
});
