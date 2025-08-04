import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonTypeofNode } from "./json-typeof-node";

describe("JsonTypeofNode", () => {
  const nodeId = "json-typeof";
  const node = new JsonTypeofNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should return 'null' for null value", async () => {
      const result = await node.execute({
        inputs: { value: null },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("null");
    });

    it("should return 'undefined' for undefined value", async () => {
      const result = await node.execute({
        inputs: { value: undefined },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("undefined");
    });

    it("should return 'array' for array value", async () => {
      const result = await node.execute({
        inputs: { value: [1, 2, 3] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("array");
    });

    it("should return 'object' for object value", async () => {
      const result = await node.execute({
        inputs: { value: { key: "value" } },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("object");
    });

    it("should return 'string' for string value", async () => {
      const result = await node.execute({
        inputs: { value: "hello world" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("string");
    });

    it("should return 'number' for number value", async () => {
      const result = await node.execute({
        inputs: { value: 42 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should return 'number' for float value", async () => {
      const result = await node.execute({
        inputs: { value: 3.14 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should return 'boolean' for true value", async () => {
      const result = await node.execute({
        inputs: { value: true },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("boolean");
    });

    it("should return 'boolean' for false value", async () => {
      const result = await node.execute({
        inputs: { value: false },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("boolean");
    });

    it("should handle complex nested objects", async () => {
      const complexObject = {
        string: "hello",
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: "value" },
      };

      const result = await node.execute({
        inputs: { value: complexObject },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("object");
    });

    it("should handle empty array", async () => {
      const result = await node.execute({
        inputs: { value: [] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("array");
    });

    it("should handle empty object", async () => {
      const result = await node.execute({
        inputs: { value: {} },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("object");
    });

    it("should handle empty string", async () => {
      const result = await node.execute({
        inputs: { value: "" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("string");
    });

    it("should handle zero", async () => {
      const result = await node.execute({
        inputs: { value: 0 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should handle negative numbers", async () => {
      const result = await node.execute({
        inputs: { value: -42 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should handle NaN", async () => {
      const result = await node.execute({
        inputs: { value: NaN },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should handle Infinity", async () => {
      const result = await node.execute({
        inputs: { value: Infinity },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("number");
    });

    it("should handle Date objects", async () => {
      const result = await node.execute({
        inputs: { value: new Date() },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("object");
    });

    it("should handle functions", async () => {
      const result = await node.execute({
        inputs: { value: () => {} },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.type).toBe("object");
    });
  });
});
