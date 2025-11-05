import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonTypeofNode } from "./json-typeof-node";

describe("JsonTypeofNode", () => {
  const nodeId = "json-typeof";
  const node = new JsonTypeofNode({
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
    it("should return 'null' for null", async () => {
      const result = await node.execute(
        createContext({
          value: null,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("null");
    });

    it("should return 'undefined' for undefined", async () => {
      const result = await node.execute(
        createContext({
          value: undefined,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("undefined");
    });

    it("should return 'array' for array", async () => {
      const result = await node.execute(
        createContext({
          value: [1, 2, 3],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("array");
    });

    it("should return 'object' for object", async () => {
      const result = await node.execute(
        createContext({
          value: { key: "value" },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("object");
    });

    it("should return 'string' for string", async () => {
      const result = await node.execute(
        createContext({
          value: "test",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("string");
    });

    it("should return 'number' for integer", async () => {
      const result = await node.execute(
        createContext({
          value: 42,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should return 'number' for float", async () => {
      const result = await node.execute(
        createContext({
          value: 3.14,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should return 'boolean' for true", async () => {
      const result = await node.execute(
        createContext({
          value: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("boolean");
    });

    it("should return 'boolean' for false", async () => {
      const result = await node.execute(
        createContext({
          value: false,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("boolean");
    });

    it("should return 'object' for complex object", async () => {
      const result = await node.execute(
        createContext({
          value: {
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
      expect(result.outputs?.type).toBe("object");
    });

    it("should return 'array' for empty array", async () => {
      const result = await node.execute(
        createContext({
          value: [],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("array");
    });

    it("should return 'object' for empty object", async () => {
      const result = await node.execute(
        createContext({
          value: {},
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("object");
    });

    it("should return 'string' for empty string", async () => {
      const result = await node.execute(
        createContext({
          value: "",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("string");
    });

    it("should return 'number' for zero", async () => {
      const result = await node.execute(
        createContext({
          value: 0,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should return 'number' for negative number", async () => {
      const result = await node.execute(
        createContext({
          value: -42,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should return 'number' for Infinity", async () => {
      const result = await node.execute(
        createContext({
          value: Infinity,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should return 'number' for NaN", async () => {
      const result = await node.execute(
        createContext({
          value: NaN,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should return 'object' for Date", async () => {
      const result = await node.execute(
        createContext({
          value: new Date(),
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("object");
    });

    it("should return 'function' for function", async () => {
      const result = await node.execute(
        createContext({
          value: () => {},
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("function");
    });
  });
});
