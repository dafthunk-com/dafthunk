import { describe, it, expect } from "vitest";
import { Node } from "../../api/types";
import { SimpleStringTemplateNode } from "./simpleStringTemplateNode";
import { NodeContext } from "../types";
import { vi } from "vitest";

describe("SimpleStringTemplateNode", () => {
  const createNode = (inputs: Record<string, any> = {}): Node => ({
    id: "test-node",
    type: "simpleStringTemplate",
    name: "Test Node",
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    ...inputs,
  });

  const createContext = (inputs: Record<string, any> = {}): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    inputs,
    env: {
      AI: {
        run: vi.fn(),
        toMarkdown: vi.fn(),
        aiGatewayLogId: "test-log-id",
        gateway: vi.fn().mockReturnValue({}),
        autorag: vi.fn().mockReturnValue({}),
        models: vi.fn().mockResolvedValue([]),
      },
    },
  });

  it("should replace a single variable in template", async () => {
    const node = new SimpleStringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Hello, ${variable}!",
        variable: "John",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result).toBe("Hello, John!");
  });

  it("should replace multiple occurrences of the same variable", async () => {
    const node = new SimpleStringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "${variable} ${variable} ${variable}",
        variable: "John",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result).toBe("John John John");
  });

  it("should handle empty template", async () => {
    const node = new SimpleStringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "",
        variable: "John",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result).toBe("");
  });

  it("should handle empty variable", async () => {
    const node = new SimpleStringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Hello, ${variable}!",
        variable: "",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result).toBe("Hello, !");
  });

  it("should handle special characters in template", async () => {
    const node = new SimpleStringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Line 1\nLine ${variable}\tTabbed",
        variable: "2",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result).toBe("Line 1\nLine 2\tTabbed");
  });

  it("should handle special characters in variable", async () => {
    const node = new SimpleStringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Hello, ${variable}!",
        variable: "John\nDoe\tSmith",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result).toBe("Hello, John\nDoe\tSmith!");
  });

  it("should fail with invalid template input", async () => {
    const node = new SimpleStringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: null,
        variable: "John",
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing template string");
  });

  it("should fail with invalid variable input", async () => {
    const node = new SimpleStringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Hello, ${variable}!",
        variable: null,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing variable value");
  });

  it("should handle template with no variable placeholder", async () => {
    const node = new SimpleStringTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "Hello, World!",
        variable: "John",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result).toBe("Hello, World!");
  });
});
