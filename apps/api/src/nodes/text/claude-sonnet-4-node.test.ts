import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { ClaudeSonnet4Node } from "./claude-sonnet-4-node";

describe("ClaudeSonnet4Node", () => {
  const mockEnv: Partial<Bindings> = {
    ANTHROPIC_API_KEY: "test-key"
  };

  const mockNode = {
    id: "test-node",
    type: "claude-sonnet-4",
    inputs: {},
    outputs: {},
    position: { x: 0, y: 0 },
  };

  it("should have correct node type definition", () => {
    expect(ClaudeSonnet4Node.nodeType).toBeDefined();
    expect(ClaudeSonnet4Node.nodeType.id).toBe("claude-sonnet-4");
    expect(ClaudeSonnet4Node.nodeType.name).toBe("Claude Sonnet 4");
    expect(ClaudeSonnet4Node.nodeType.type).toBe("claude-sonnet-4");
    expect(ClaudeSonnet4Node.nodeType.description).toBe("Latest Claude Sonnet model with advanced capabilities");
    expect(ClaudeSonnet4Node.nodeType.tags).toEqual(["Text", "AI"]);
    expect(ClaudeSonnet4Node.nodeType.computeCost).toBe(30);
    expect(ClaudeSonnet4Node.nodeType.inputs).toHaveLength(2);
    expect(ClaudeSonnet4Node.nodeType.outputs).toHaveLength(1);
  });

  it("should instantiate correctly", () => {
    const node = new ClaudeSonnet4Node(mockNode, mockEnv);
    expect(node).toBeDefined();
  });

  it("should fail without API key", async () => {
    const node = new ClaudeSonnet4Node(mockNode, {});
    const result = await node.execute({
      inputs: { input: "Hello" },
      env: {} as Bindings,
      objectStore: {} as any,
    });

    expect(result.status).toBe("error");
    expect(result.error).toBe("ANTHROPIC_API_KEY is not configured");
  });

  it("should fail without input", async () => {
    const node = new ClaudeSonnet4Node(mockNode, mockEnv);
    const result = await node.execute({
      inputs: {},
      env: mockEnv as Bindings,
      objectStore: {} as any,
    });

    expect(result.status).toBe("error");
    expect(result.error).toBe("Input is required");
  });

  it("should have correct input parameters", () => {
    const inputs = ClaudeSonnet4Node.nodeType.inputs;
    
    const instructionsInput = inputs.find(input => input.name === "instructions");
    expect(instructionsInput).toBeDefined();
    expect(instructionsInput?.type).toBe("string");
    expect(instructionsInput?.required).toBe(false);
    expect(instructionsInput?.value).toBe("You are a helpful assistant.");

    const inputParam = inputs.find(input => input.name === "input");
    expect(inputParam).toBeDefined();
    expect(inputParam?.type).toBe("string");
    expect(inputParam?.required).toBe(true);
  });

  it("should have correct output parameters", () => {
    const outputs = ClaudeSonnet4Node.nodeType.outputs;
    
    const responseOutput = outputs.find(output => output.name === "response");
    expect(responseOutput).toBeDefined();
    expect(responseOutput?.type).toBe("string");
    expect(responseOutput?.description).toBe("Generated text response from Claude Sonnet 4");
  });
});
