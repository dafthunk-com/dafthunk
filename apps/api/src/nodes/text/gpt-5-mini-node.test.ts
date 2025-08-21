import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { Gpt5MiniNode } from "./gpt-5-mini-node";

describe("Gpt5MiniNode", () => {
  const mockNode = {
    id: "test-node",
    type: "gpt-5-mini",
  } as Node;

  it("should have correct node type definition", () => {
    expect(Gpt5MiniNode.nodeType).toBeDefined();
    expect(Gpt5MiniNode.nodeType.id).toBe("gpt-5-mini");
    expect(Gpt5MiniNode.nodeType.name).toBe("GPT-5 Mini");
    expect(Gpt5MiniNode.nodeType.type).toBe("gpt-5-mini");
    expect(Gpt5MiniNode.nodeType.description).toBe("Faster, cost-effective version of GPT-5");
    expect(Gpt5MiniNode.nodeType.tags).toEqual(["Text", "AI"]);
    expect(Gpt5MiniNode.nodeType.computeCost).toBe(15);
    expect(Gpt5MiniNode.nodeType.inputs).toHaveLength(2);
    expect(Gpt5MiniNode.nodeType.outputs).toHaveLength(1);
  });

  it("should instantiate correctly", () => {
    const node = new Gpt5MiniNode(mockNode);
    expect(node).toBeDefined();
  });

  it("should fail without API key", async () => {
    const node = new Gpt5MiniNode(mockNode);
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
    const node = new Gpt5MiniNode(mockNode);
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
    const inputs = Gpt5MiniNode.nodeType.inputs;
    
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
    const outputs = Gpt5MiniNode.nodeType.outputs;
    
    const responseOutput = outputs.find(output => output.name === "response");
    expect(responseOutput).toBeDefined();
    expect(responseOutput?.type).toBe("string");
    expect(responseOutput?.description).toBe("Generated text response from GPT-5 Mini");
  });
});