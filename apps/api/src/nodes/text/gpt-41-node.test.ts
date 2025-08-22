import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { Gpt41Node } from "./gpt-41-node";

describe("Gpt41Node", () => {
  const mockNode = {
    id: "test-node",
    type: "gpt-4.1",
  } as Node;

  it("should have correct node type definition", () => {
    expect(Gpt41Node.nodeType).toBeDefined();
    expect(Gpt41Node.nodeType.id).toBe("gpt-4.1");
    expect(Gpt41Node.nodeType.name).toBe("GPT-4.1");
    expect(Gpt41Node.nodeType.type).toBe("gpt-4.1");
    expect(Gpt41Node.nodeType.description).toBe("Latest GPT-4 iteration with enhanced capabilities");
    expect(Gpt41Node.nodeType.tags).toEqual(["Text", "AI"]);
    expect(Gpt41Node.nodeType.computeCost).toBe(25);
    expect(Gpt41Node.nodeType.inputs).toHaveLength(2);
    expect(Gpt41Node.nodeType.outputs).toHaveLength(1);
  });

  it("should instantiate correctly", () => {
    const node = new Gpt41Node(mockNode);
    expect(node).toBeDefined();
  });

  it("should fail without API key", async () => {
    const node = new Gpt41Node(mockNode);
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
    const node = new Gpt41Node(mockNode);
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
    const inputs = Gpt41Node.nodeType.inputs;
    
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
    const outputs = Gpt41Node.nodeType.outputs;
    
    const responseOutput = outputs.find(output => output.name === "response");
    expect(responseOutput).toBeDefined();
    expect(responseOutput?.type).toBe("string");
    expect(responseOutput?.description).toBe("Generated text response from GPT-4.1");
  });
});