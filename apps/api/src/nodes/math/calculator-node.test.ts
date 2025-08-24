import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CalculatorNode } from "./calculator-node";

describe("CalculatorNode", () => {
  const createNode = (): Node =>
    ({
      id: "test-calculator",
      type: "calculator",
      position: { x: 0, y: 0 },
    }) as unknown as Node;

  const createContext = (inputs: Record<string, any>) =>
    ({
      nodeId: "test-calculator",
      inputs,
      workflowId: "test-workflow",
      executionId: "test-execution",
      organizationId: "test-org",
      env: {},
      nodeRegistry: null,
      toolRegistry: null,
    }) as unknown as NodeContext;

  describe("execute", () => {
    it("should evaluate simple arithmetic expressions", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "2 + 3" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(5);
    });

    it("should handle multiplication and division", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "10 * 5 / 2" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(25);
    });

    it("should handle parentheses and order of operations", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "(2 + 3) * 4" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(20);
    });

    it("should handle exponentiation with ^ symbol", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "2^3" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(8);
    });

    it("should handle mathematical functions", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "sqrt(16)" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(4);
    });

    it("should handle trigonometric functions", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "sin(0)" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(0);
    });

    it("should handle constants", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "PI" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(Math.PI);
    });

    it("should handle complex expressions", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "sqrt(16) + sin(0) * 5" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(4);
    });

    it("should return error for empty expression", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "" });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing or empty expression.");
    });

    it("should return error for invalid characters", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "alert('hello')" });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Expression contains invalid characters");
    });

    it("should return error for invalid mathematical expressions", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "2 +" });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
    });

    it("should handle decimal numbers", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "3.14 * 2" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(6.28);
    });

    it("should handle modulo operator", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "17 % 5" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(2);
    });

    it("should handle bitwise AND operator", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "15 & 7" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(7);
    });

    it("should handle bitwise OR operator", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "8 | 4" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(12);
    });

    it("should handle bitwise NOT operator", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "~10" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(-11);
    });

    it("should handle additional math functions", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({
        expression: "sign(-5) + trunc(3.7) + hypot(3, 4)",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(-1 + 3 + 5); // -1 + 3 + 5 = 7
    });

    it("should handle atan2 function", async () => {
      const node = new CalculatorNode(createNode());
      const context = createContext({ expression: "atan2(1, 1)" });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(Math.PI / 4);
    });
  });
});
