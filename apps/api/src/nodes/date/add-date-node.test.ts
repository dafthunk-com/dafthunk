import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { AddDateNode } from "./add-date-node";

describe("AddDateNode", () => {
  const nodeId = "date-add";
  const node = new AddDateNode({
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
    it("should add days", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 5,
          unit: "days",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2023-12-30T10:30:00.000Z");
    });

    it("should add hours", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 2,
          unit: "hours",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2023-12-25T12:30:00.000Z");
    });

    it("should add minutes", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 45,
          unit: "minutes",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2023-12-25T11:15:00.000Z");
    });

    it("should add seconds", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 30,
          unit: "seconds",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2023-12-25T10:30:30.000Z");
    });

    it("should add milliseconds", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 500,
          unit: "milliseconds",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2023-12-25T10:30:00.500Z");
    });

    it("should add weeks", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 2,
          unit: "weeks",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2024-01-08T10:30:00.000Z");
    });

    it("should add months", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 1,
          unit: "months",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2024-01-25T10:30:00.000Z");
    });

    it("should add years", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 1,
          unit: "years",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2024-12-25T10:30:00.000Z");
    });

    it("should subtract time with negative amount", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: -5,
          unit: "days",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2023-12-20T10:30:00.000Z");
    });

    it("should handle invalid date input", async () => {
      const result = await node.execute(
        createContext({
          date: "invalid-date",
          amount: 5,
          unit: "days",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBeUndefined();
    });

    it("should handle invalid unit", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 5,
          unit: "invalid-unit",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBeUndefined();
    });

    it("should handle string amount", async () => {
      const baseDate = "2023-12-25T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: "5",
          unit: "days",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2023-12-30T10:30:00.000Z");
    });

    it("should handle leap year correctly", async () => {
      const baseDate = "2024-02-28T10:30:00.000Z";
      const result = await node.execute(
        createContext({
          date: baseDate,
          amount: 1,
          unit: "days",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBe("2024-02-29T10:30:00.000Z");
    });
  });
});
