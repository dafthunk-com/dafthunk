import { describe, it, expect } from "vitest";
import { StringTemplateNode } from "./stringTemplateNode";
import { Node } from "../../types";

describe("StringTemplateNode", () => {
  const createNode = (inputs: Record<string, any> = {}): Node => ({
    id: "test-node",
    type: "stringTemplate",
    name: "Test Node",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
    ...inputs,
  });

  const createContext = (inputs: Record<string, any> = {}) => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    inputs,
  });

  it("should replace a single variable in template", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Hello, ${name}!",
        variables: { name: "John" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe("Hello, John!");
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should replace multiple variables in template", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "${greeting}, ${name}! You are ${age} years old.",
        variables: { greeting: "Hi", name: "John", age: 30 },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe(
      "Hi, John! You are 30 years old."
    );
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle missing variables", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Hello, ${name}! Your age is ${age}.",
        variables: { name: "John" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe(
      "Hello, John! Your age is ${age}."
    );
    expect(result.outputs?.missingVariables.getValue()).toEqual(["age"]);
  });

  it("should handle repeated variables", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "${name} ${name} ${name}",
        variables: { name: "John" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe("John John John");
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle non-string variable values", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Age: ${age}, Active: ${isActive}, Score: ${score}",
        variables: { age: 30, isActive: true, score: 99.9 },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe(
      "Age: 30, Active: true, Score: 99.9"
    );
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle null and undefined values", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Null: ${nullValue}, Undefined: ${undefinedValue}",
        variables: { nullValue: null, undefinedValue: undefined },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe("Null: , Undefined: ");
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle template with no variables", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Hello, World!",
        variables: {},
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe("Hello, World!");
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle empty template", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "",
        variables: { name: "John" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe("");
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should fail with invalid template input", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: null,
        variables: {},
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing template string");
  });

  it("should fail with invalid variables input", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Hello, ${name}!",
        variables: null,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing variables object");
  });

  it("should handle complex nested variable names", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "${very.complex.nested.variable.name}",
        variables: { "very.complex.nested.variable.name": "works!" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe("works!");
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle special characters in template", async () => {
    const node = new StringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Line 1\nLine ${num}\tTabbed ${var}",
        variables: { num: 2, var: "value" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toBe(
      "Line 1\nLine 2\tTabbed value"
    );
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });
});
