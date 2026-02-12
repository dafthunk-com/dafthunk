import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { FormatDateNode } from "./format-date-node";

describe("FormatDateNode", () => {
  const nodeId = "date-format";
  const node = new FormatDateNode({
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
    it("should format with YYYY-MM-DD pattern", async () => {
      const result = await node.execute(
        createContext({
          date: "2023-12-25T10:30:00.000Z",
          pattern: "YYYY-MM-DD",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("2023-12-25");
    });

    it("should format with hh:mm:ss pattern", async () => {
      const result = await node.execute(
        createContext({
          date: "2023-12-25T10:30:45.000Z",
          pattern: "hh:mm:ss",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("10:30:45");
    });

    it("should format with full pattern", async () => {
      const result = await node.execute(
        createContext({
          date: "2023-12-25T10:30:45.123Z",
          pattern: "YYYY-MM-DDThh:mm:ss",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("2023-12-25T10:30:45");
    });

    it("should use default pattern when none provided", async () => {
      const result = await node.execute(
        createContext({
          date: "2023-12-25T10:30:45.000Z",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("2023-12-25T10:30:45Z");
    });

    it("should handle empty pattern", async () => {
      const result = await node.execute(
        createContext({
          date: "2023-12-25T10:30:45.000Z",
          pattern: "",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("2023-12-25T10:30:45Z");
    });

    it("should handle locale formatting", async () => {
      const result = await node.execute(
        createContext({
          date: "2023-12-25T10:30:45.000Z",
          pattern: "invalid-pattern",
          locale: "en-US",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toMatch(/12\/25\/2023, 10:30:45/);
    });

    it("should handle invalid date input", async () => {
      const result = await node.execute(
        createContext({
          date: "invalid-date",
          pattern: "YYYY-MM-DD",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("");
    });

    it("should handle null date input", async () => {
      const result = await node.execute(
        createContext({
          date: null,
          pattern: "YYYY-MM-DD",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("");
    });

    it("should handle undefined date input", async () => {
      const result = await node.execute(
        createContext({
          date: undefined,
          pattern: "YYYY-MM-DD",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("");
    });

    it("should handle empty string date input", async () => {
      const result = await node.execute(
        createContext({
          date: "",
          pattern: "YYYY-MM-DD",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("");
    });

    it("should handle mixed pattern tokens", async () => {
      const result = await node.execute(
        createContext({
          date: "2023-12-25T10:30:45.000Z",
          pattern: "Date: YYYY-MM-DD, Time: hh:mm:ss",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("Date: 2023-12-25, Time: 10:30:45");
    });

    it("should handle pattern with no tokens", async () => {
      const result = await node.execute(
        createContext({
          date: "2023-12-25T10:30:45.000Z",
          pattern: "Hello World",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("Hello World");
    });

    it("should handle different locales", async () => {
      const result = await node.execute(
        createContext({
          date: "2023-12-25T10:30:45.000Z",
          pattern: "invalid-pattern",
          locale: "fr-FR",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toMatch(/25\/12\/2023/);
    });

    it("should handle leap year date", async () => {
      const result = await node.execute(
        createContext({
          date: "2024-02-29T10:30:45.000Z",
          pattern: "YYYY-MM-DD",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.text).toBe("2024-02-29");
    });
  });
});
