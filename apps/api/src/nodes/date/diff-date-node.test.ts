import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { DiffDateNode } from "./diff-date-node";

describe("DiffDateNode", () => {
  const nodeId = "date-diff";
  const node = new DiffDateNode({
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
    it("should calculate difference in milliseconds", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-25T10:30:00.000Z",
          b: "2023-12-25T10:30:00.500Z",
          unit: "milliseconds",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(-500);
    });

    it("should calculate difference in seconds", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-25T10:30:30.000Z",
          b: "2023-12-25T10:30:00.000Z",
          unit: "seconds",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(30);
    });

    it("should calculate difference in minutes", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-25T10:45:00.000Z",
          b: "2023-12-25T10:30:00.000Z",
          unit: "minutes",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(15);
    });

    it("should calculate difference in hours", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-25T12:30:00.000Z",
          b: "2023-12-25T10:30:00.000Z",
          unit: "hours",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(2);
    });

    it("should calculate difference in days", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-30T10:30:00.000Z",
          b: "2023-12-25T10:30:00.000Z",
          unit: "days",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(5);
    });

    it("should calculate difference in weeks", async () => {
      const result = await node.execute(
        createContext({
          a: "2024-01-08T10:30:00.000Z",
          b: "2023-12-25T10:30:00.000Z",
          unit: "weeks",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(2);
    });

    it("should calculate difference in months", async () => {
      const result = await node.execute(
        createContext({
          a: "2024-01-25T10:30:00.000Z",
          b: "2023-12-25T10:30:00.000Z",
          unit: "months",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(1);
    });

    it("should calculate difference in years", async () => {
      const result = await node.execute(
        createContext({
          a: "2024-12-25T10:30:00.000Z",
          b: "2023-12-25T10:30:00.000Z",
          unit: "years",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(1);
    });

    it("should return absolute difference when absolute is true", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-25T10:30:00.000Z",
          b: "2023-12-25T10:30:30.000Z",
          unit: "seconds",
          absolute: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(30);
    });

    it("should return negative difference when absolute is false", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-25T10:30:00.000Z",
          b: "2023-12-25T10:30:30.000Z",
          unit: "seconds",
          absolute: false,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(-30);
    });

    it("should handle invalid date input", async () => {
      const result = await node.execute(
        createContext({
          a: "invalid-date",
          b: "2023-12-25T10:30:00.000Z",
          unit: "days",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBeUndefined();
    });

    it("should handle invalid unit", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-25T10:30:00.000Z",
          b: "2023-12-25T10:30:30.000Z",
          unit: "invalid-unit",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBeUndefined();
    });

    it("should handle string inputs", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-25T10:30:00.000Z",
          b: "2023-12-25T10:30:30.000Z",
          unit: "seconds",
          absolute: "true",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(30);
    });

    it("should handle leap year correctly", async () => {
      const result = await node.execute(
        createContext({
          a: "2024-03-01T10:30:00.000Z",
          b: "2024-02-28T10:30:00.000Z",
          unit: "days",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(2);
    });

    it("should handle same dates", async () => {
      const result = await node.execute(
        createContext({
          a: "2023-12-25T10:30:00.000Z",
          b: "2023-12-25T10:30:00.000Z",
          unit: "days",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.value).toBe(0);
    });
  });
});
