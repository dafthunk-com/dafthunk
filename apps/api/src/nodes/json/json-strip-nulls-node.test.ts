import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonStripNullsNode } from "./json-strip-nulls-node";

describe("JsonStripNullsNode", () => {
  const nodeId = "json-strip-nulls";
  const node = new JsonStripNullsNode({
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
    it("should strip null values from object", async () => {
      const result = await node.execute(
        createContext({
          value: {
            a: 1,
            b: null,
            c: "string",
            d: null,
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        a: 1,
        c: "string",
      });
    });

    it("should strip null values from array", async () => {
      const result = await node.execute(
        createContext({
          value: ["a", null, 1, null, "b"],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual(["a", 1, "b"]);
    });

    it("should handle nested null values", async () => {
      const result = await node.execute(
        createContext({
          value: {
            a: 1,
            b: null,
            c: [1, null, 2],
            d: {
              x: null,
              y: "string",
            },
          },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        a: 1,
        c: [1, 2],
        d: {
          y: "string",
        },
      });
    });

    it("should handle recursive stripping", async () => {
      const result = await node.execute(
        createContext({
          value: {
            a: 1,
            b: null,
            c: [1, null, 2],
            d: {
              x: null,
              y: "string",
            },
          },
          recursive: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toEqual({
        a: 1,
        c: [1, 2],
        d: {
          y: "string",
        },
      });
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

    it("should handle string input", async () => {
      const result = await node.execute(
        createContext({
          value: "test string",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe("test string");
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
  });
});
