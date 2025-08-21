import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { Gpt5NanoNode } from "./gpt-5-nano-node";

describe("Gpt5NanoNode", () => {
  const mockNode = {
    id: "test-node",
    type: "gpt-5-nano",
  } as Node;

  it("should have correct node type definition", () => {
    expect(Gpt5NanoNode.nodeType).toBeDefined();
    expect(Gpt5NanoNode.nodeType.id).toBe("gpt-5-nano");
    expect(Gpt5NanoNode.nodeType.name).toBe("GPT-5 Nano");
    expect(Gpt5NanoNode.nodeType.type).toBe("gpt-5-nano");
    expect(Gpt5NanoNode.nodeType.description).toBe("Ultra-lightweight, high-speed model");
    expect(Gpt5NanoNode.nodeType.tags).toEqual(["Text", "AI"]);
    expect(Gpt5NanoNode.nodeType.computeCost).toBe(5);
    expect(Gpt5NanoNode.nodeType.inputs).toHaveLength(2);
    expect(Gpt5NanoNode.nodeType.outputs).toHaveLength(1);
  });

  it("should instantiate correctly", () => {
    const node = new Gpt5NanoNode(mockNode);
    expect(node).toBeDefined();
  });

  it("should fail without API key", async () => {
    const node = new Gpt5NanoNode(mockNode);
    const context = {
      nodeId: "test-node",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs: { input: "Hello" },
      env: {},
    } as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("OPENAI_API_KEY is not configured");
  });

  it("should fail without input", async () => {
    const node = new Gpt5NanoNode(mockNode);
    const context = {
      nodeId: "test-node",
      workflowId: "test-workflow", 
      organizationId: "test-org",
      inputs: {},
      env: {
        OPENAI_API_KEY: "test-key"
      },
    } as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input is required");
  });

  it("should have correct input parameters", () => {
    const inputs = Gpt5NanoNode.nodeType.inputs;
    
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
    const outputs = Gpt5NanoNode.nodeType.outputs;
    
    const responseOutput = outputs.find(output => output.name === "response");
    expect(responseOutput).toBeDefined();
    expect(responseOutput?.type).toBe("string");
    expect(responseOutput?.description).toBe("Generated text response from GPT-5 Nano");
  });
});