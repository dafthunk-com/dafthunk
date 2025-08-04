import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { JsonValidNode } from "./json-valid-node";

describe("JsonValidNode", () => {
  const nodeId = "json-valid";
  const node = new JsonValidNode({
    nodeId,
  } as unknown as Node);

  describe("execute", () => {
    it("should return true for valid JSON object", async () => {
      const result = await node.execute({
        inputs: { value: '{"key": "value"}' },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toEqual({ key: "value" });
      expect(result.outputs?.error).toBeNull();
    });

    it("should return true for valid JSON array", async () => {
      const result = await node.execute({
        inputs: { value: "[1, 2, 3]" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toEqual([1, 2, 3]);
      expect(result.outputs?.error).toBeNull();
    });

    it("should return true for valid JSON string", async () => {
      const result = await node.execute({
        inputs: { value: '"hello world"' },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toBe("hello world");
      expect(result.outputs?.error).toBeNull();
    });

    it("should return true for valid JSON number", async () => {
      const result = await node.execute({
        inputs: { value: "42" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toBe(42);
      expect(result.outputs?.error).toBeNull();
    });

    it("should return true for valid JSON boolean", async () => {
      const result = await node.execute({
        inputs: { value: "true" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toBe(true);
      expect(result.outputs?.error).toBeNull();
    });

    it("should return true for valid JSON null", async () => {
      const result = await node.execute({
        inputs: { value: "null" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toBeNull();
    });

    it("should return true for complex valid JSON", async () => {
      const complexJson = `{
        "string": "hello",
        "number": 42,
        "boolean": true,
        "null": null,
        "array": [1, 2, 3],
        "object": {"nested": "value"}
      }`;

      const result = await node.execute({
        inputs: { value: complexJson },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toEqual({
        string: "hello",
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: "value" },
      });
      expect(result.outputs?.error).toBeNull();
    });

    it("should return false for invalid JSON - missing closing brace", async () => {
      const result = await node.execute({
        inputs: { value: '{"key": "value"' },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toContain(
        "Expected ',' or '}' after property value"
      );
    });

    it("should return false for invalid JSON - missing closing bracket", async () => {
      const result = await node.execute({
        inputs: { value: "[1, 2, 3" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toContain(
        "Expected ',' or ']' after array element"
      );
    });

    it("should return false for invalid JSON - trailing comma", async () => {
      const result = await node.execute({
        inputs: { value: '{"key": "value",}' },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toContain(
        "Expected double-quoted property name"
      );
    });

    it("should return false for invalid JSON - unquoted key", async () => {
      const result = await node.execute({
        inputs: { value: '{key: "value"}' },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toContain("Expected property name or '}'");
    });

    it("should return false for invalid JSON - single quotes", async () => {
      const result = await node.execute({
        inputs: { value: "{'key': 'value'}" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toContain("Expected property name or '}'");
    });

    it("should return false for empty string", async () => {
      const result = await node.execute({
        inputs: { value: "" },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toBe("Empty string is not valid JSON");
    });

    it("should return false for whitespace only string", async () => {
      const result = await node.execute({
        inputs: { value: "   " },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toBe("Empty string is not valid JSON");
    });

    it("should return false for null input", async () => {
      const result = await node.execute({
        inputs: { value: null },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toBe("Input value is required");
    });

    it("should return false for undefined input", async () => {
      const result = await node.execute({
        inputs: { value: undefined },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toBe("Input value is required");
    });

    it("should return false for non-string input", async () => {
      const result = await node.execute({
        inputs: { value: 42 },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toBe("Input must be a string");
    });

    it("should return false for object input", async () => {
      const result = await node.execute({
        inputs: { value: { key: "value" } },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toBe("Input must be a string");
    });

    it("should return false for array input", async () => {
      const result = await node.execute({
        inputs: { value: [1, 2, 3] },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toBe("Input must be a string");
    });

    it("should return false for boolean input", async () => {
      const result = await node.execute({
        inputs: { value: true },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.parsedValue).toBeNull();
      expect(result.outputs?.error).toBe("Input must be a string");
    });

    it("should handle JSON with escaped characters", async () => {
      const result = await node.execute({
        inputs: { value: '"Hello\\nWorld\\tTab"' },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toBe("Hello\nWorld\tTab");
      expect(result.outputs?.error).toBeNull();
    });

    it("should handle JSON with unicode characters", async () => {
      const result = await node.execute({
        inputs: { value: '"Hello \\u0041\\u0042\\u0043"' },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toBe("Hello ABC");
      expect(result.outputs?.error).toBeNull();
    });

    it("should handle JSON with special characters in keys", async () => {
      const result = await node.execute({
        inputs: {
          value:
            '{"key-with-dashes": "value", "key_with_underscores": "value2"}',
        },
        nodeId: "test",
        workflowId: "test",
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsedValue).toEqual({
        "key-with-dashes": "value",
        key_with_underscores: "value2",
      });
      expect(result.outputs?.error).toBeNull();
    });
  });
});
