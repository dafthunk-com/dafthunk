import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonFlattenNode } from "./json-flatten-node";

describe("JsonFlattenNode", () => {
  const nodeId = "json-flatten";
  const node = new JsonFlattenNode({
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
    it("should flatten nested object with default separator", async () => {
      const result = await node.execute(
        createContext({
          value: {
            a: 1,
            b: {
              c: 2,
              d: {
                e: 3,
              },
            },
            f: [4, 5, 6],
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        a: 1,
        "b.c": 2,
        "b.d.e": 3,
        f: [4, 5, 6],
      });
    });

    it("should flatten nested object with custom separator", async () => {
      const result = await node.execute(
        createContext({
          value: {
            a: 1,
            b: {
              c: 2,
            },
          },
          separator: "_",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        a: 1,
        b_c: 2,
      });
    });

    it("should handle arrays when includeArrays is false", async () => {
      const result = await node.execute(
        createContext({
          value: {
            items: [
              { name: "item1", value: 10 },
              { name: "item2", value: 20 },
            ],
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        items: [
          { name: "item1", value: 10 },
          { name: "item2", value: 20 },
        ],
      });
    });

    it("should flatten arrays when includeArrays is true", async () => {
      const result = await node.execute(
        createContext({
          value: {
            items: [
              { name: "item1", value: 10 },
              { name: "item2", value: 20 },
            ],
          },
          includeArrays: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        "items[0].name": "item1",
        "items[0].value": 10,
        "items[1].name": "item2",
        "items[1].value": 20,
      });
    });

    it("should handle string input", async () => {
      const result = await node.execute(
        createContext({
          value: "test string",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe("test string");
    });

    it("should handle number input", async () => {
      const result = await node.execute(
        createContext({
          value: 42,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(42);
    });

    it("should handle null input", async () => {
      const result = await node.execute(
        createContext({
          value: null,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBeNull();
    });

    it("should handle empty object", async () => {
      const result = await node.execute(
        createContext({
          value: {},
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({});
    });

    it("should handle empty array", async () => {
      const result = await node.execute(
        createContext({
          value: [],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual([]);
    });

    it("should handle complex nested structure", async () => {
      const result = await node.execute(
        createContext({
          value: {
            user: {
              name: "John",
              address: {
                street: "123 Main St",
                city: "Anytown",
              },
              hobbies: ["reading", "swimming"],
            },
            active: true,
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        "user.name": "John",
        "user.address.street": "123 Main St",
        "user.address.city": "Anytown",
        "user.hobbies": ["reading", "swimming"],
        active: true,
      });
    });
  });
});
