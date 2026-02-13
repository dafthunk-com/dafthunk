import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ParseDateNode } from "./parse-date-node";

describe("ParseDateNode", () => {
  const nodeId = "date-parse";
  const node = new ParseDateNode({
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
    it("should parse ISO string", async () => {
      const isoString = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          value: isoString,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe(isoString);
    });

    it("should parse epoch milliseconds", async () => {
      const epoch = 1703508600000; // 2023-12-25T12:50:00.000Z
      const result = await node.execute(
        createContext({
          value: epoch,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2023-12-25T12:50:00.000Z");
    });

    it("should parse Date object", async () => {
      const date = new Date("2023-12-25T10:30:00.000Z");
      const result = await node.execute(
        createContext({
          value: date,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2023-12-25T10:30:00.000Z");
    });

    it("should parse various date string formats", async () => {
      const testCases = [
        "2023-12-25",
        "2023-12-25T10:30:00",
        "2023-12-25T10:30:00Z",
        "December 25, 2023",
        "12/25/2023",
      ];

      for (const testCase of testCases) {
        const result = await node.execute(
          createContext({
            value: testCase,
          })
        );

        expect(result.status).toBe("completed");
        expect(result.outputs?.date).toBeDefined();
        expect(typeof result.outputs?.date).toBe("string");
      }
    });

    it("should return undefined for invalid date string", async () => {
      const result = await node.execute(
        createContext({
          value: "invalid-date",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBeUndefined();
    });

    it("should return undefined for invalid epoch", async () => {
      const result = await node.execute(
        createContext({
          value: NaN,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBeUndefined();
    });

    it("should handle null input", async () => {
      const result = await node.execute(
        createContext({
          value: null,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBeUndefined();
    });

    it("should handle undefined input", async () => {
      const result = await node.execute(
        createContext({
          value: undefined,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBeUndefined();
    });
  });
});
