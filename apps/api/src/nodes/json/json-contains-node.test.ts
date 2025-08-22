import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonContainsNode } from "./json-contains-node";

describe("JsonContainsNode", () => {
  const nodeId = "json-contains";
  const node = new JsonContainsNode({
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
    it("should return false for null input", async () => {
      const result = await node.execute(
        createContext({ json: null, value: "test" })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(false);
    });

    it("should return false for undefined input", async () => {
      const result = await node.execute(
        createContext({ json: undefined, value: "test" })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(false);
    });

    it("should find string in array", async () => {
      const result = await node.execute(
        createContext({ json: ["apple", "banana", "cherry"], value: "banana" })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should not find string in array", async () => {
      const result = await node.execute(
        createContext({ json: ["apple", "banana", "cherry"], value: "orange" })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should find number in array", async () => {
      const result = await node.execute(
        createContext({ json: [1, 2, 3, 4, 5], value: 3 })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should find object in array", async () => {
      const result = await node.execute(
        createContext({
          json: [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
          ],
          value: { name: "Jane", age: 25 },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should find value at specific path", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry"] },
          value: "banana",
          path: "$.items",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should not find value at non-existent path", async () => {
      const result = await node.execute(
        createContext({
          json: { items: ["apple", "banana", "cherry"] },
          value: "banana",
          path: "$.nonexistent",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should find nested object", async () => {
      const result = await node.execute(
        createContext({
          json: {
            user: {
              profile: { name: "John", age: 30 },
            },
          },
          value: { name: "John", age: 30 },
          path: "$.user.profile",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should handle array index in path", async () => {
      const result = await node.execute(
        createContext({
          json: {
            items: [
              ["a", "b", "c"],
              ["d", "e", "f"],
            ],
          },
          value: "e",
          path: "$.items[1]",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(true);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should return false for null search value", async () => {
      const result = await node.execute(
        createContext({ json: ["apple", "banana", "cherry"], value: null })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(true);
    });

    it("should return false for undefined search value", async () => {
      const result = await node.execute(
        createContext({ json: ["apple", "banana", "cherry"], value: undefined })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.contains).toBe(false);
      expect(result.outputs?.isValid).toBe(true);
    });
  });
});
