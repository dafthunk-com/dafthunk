import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { JsonArrayLengthNode } from "./json-array-length-node";

describe("JsonArrayLengthNode", () => {
  const nodeId = "json-array-length";
  const node = new JsonArrayLengthNode({
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
    it("should return 0 for null input", async () => {
      const result = await node.execute(
        createContext({
          array: null,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
    });

    it("should return 0 for undefined input", async () => {
      const result = await node.execute(
        createContext({
          array: undefined,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
    });

    it("should return 0 for string input", async () => {
      const result = await node.execute(
        createContext({
          array: "not an array",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
    });

    it("should return 0 for object input", async () => {
      const result = await node.execute(
        createContext({
          array: { key: "value" },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
    });

    it("should return 0 for empty array", async () => {
      const result = await node.execute(
        createContext({
          array: [],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(0);
    });

    it("should return length for string array", async () => {
      const result = await node.execute(
        createContext({
          array: ["apple", "banana", "cherry"],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(3);
    });

    it("should return length for number array", async () => {
      const result = await node.execute(
        createContext({
          array: [1, 2, 3, 4, 5],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(5);
    });

    it("should return length for mixed array", async () => {
      const result = await node.execute(
        createContext({
          array: ["string", 42, true, { key: "value" }, null],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(5);
    });

    it("should return length for nested array", async () => {
      const result = await node.execute(
        createContext({
          array: [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(3);
    });

    it("should return length for object array", async () => {
      const result = await node.execute(
        createContext({
          array: [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(2);
    });

    it("should return length for single element array", async () => {
      const result = await node.execute(
        createContext({
          array: ["single"],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(1);
    });

    it("should return length for large array", async () => {
      const result = await node.execute(
        createContext({
          array: Array.from({ length: 100 }, (_, i) => i),
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(100);
    });

    it("should return length for boolean array", async () => {
      const result = await node.execute(
        createContext({
          array: [true, false, true, true, false],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(5);
    });

    it("should return length for array with null values", async () => {
      const result = await node.execute(
        createContext({
          array: ["a", null, "b", null, "c"],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(5);
    });

    it("should return length for array with undefined values", async () => {
      const result = await node.execute(
        createContext({
          array: ["a", undefined, "b", undefined, "c"],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(5);
    });

    it("should return length for array with negative numbers", async () => {
      const result = await node.execute(
        createContext({
          array: [-1, -2, -3, -4, -5],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(5);
    });

    it("should return length for complex object array", async () => {
      const result = await node.execute(
        createContext({
          array: [
            { complex: "object", with: "nested", data: [1, 2, 3] },
            { another: "object", with: "different", data: [4, 5, 6] },
          ],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(2);
    });

    it("should return length for function array", async () => {
      const result = await node.execute(
        createContext({
          array: [() => {}, () => {}, () => {}],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(3);
    });

    it("should return length for Date array", async () => {
      const result = await node.execute(
        createContext({
          array: [new Date(), new Date(), new Date()],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(3);
    });

    it("should return length for any array", async () => {
      const result = await node.execute(
        createContext({
          array: [1, "string", true, null, undefined, {}, []] as any[],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.length).toBe(7);
    });
  });
});
