import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JavaScriptInputNode } from "./javascript-input-node";

describe("JavaScriptInputNode", () => {
  it("should return default JavaScript code when no value provided", async () => {
    const nodeId = "javascript-editor";
    const node = new JavaScriptInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        javascript: "// Write your JavaScript code here",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.javascript).toBe(
      "// Write your JavaScript code here"
    );
  });

  it("should return custom JavaScript code", async () => {
    const nodeId = "javascript-editor";
    const node = new JavaScriptInputNode({
      nodeId,
    } as unknown as Node);

    const customCode = `function greet(name) {
  return "Hello, " + name + "!";
}
console.log(greet("World"));`;

    const context = {
      nodeId,
      inputs: {
        javascript: customCode,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.javascript).toBe(customCode);
  });

  it("should handle empty string value", async () => {
    const nodeId = "javascript-editor";
    const node = new JavaScriptInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        javascript: "",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.javascript).toBe("");
  });

  it("should handle undefined value", async () => {
    const nodeId = "javascript-editor";
    const node = new JavaScriptInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.javascript).toBeUndefined();
  });

  it("should handle complex JavaScript code with comments", async () => {
    const nodeId = "javascript-editor";
    const node = new JavaScriptInputNode({
      nodeId,
    } as unknown as Node);

    const complexCode = `// This is a complex JavaScript example
const calculateSum = (a, b) => {
  // Add two numbers
  return a + b;
};

// Test the function
const result = calculateSum(5, 3);
console.log("Result:", result); // Should output: Result: 8`;

    const context = {
      nodeId,
      inputs: {
        javascript: complexCode,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.javascript).toBe(complexCode);
  });
});
