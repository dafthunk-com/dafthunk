import { describe, it, expect } from "vitest";
import { JsonStringExtractorNode } from "./jsonStringExtractorNode";
import { Node } from "../../runtimeTypes";

describe("JsonStringExtractorNode", () => {
  const createNode = (inputs: Record<string, any> = {}): Node => ({
    id: "test-node",
    type: "jsonStringExtractor",
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

  it("should extract a string value from a simple path", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { name: "John Doe" },
        path: "$.name",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe("John Doe");
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract a nested string value", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { profile: { email: "john@example.com" } } },
        path: "$.user.profile.email",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe("john@example.com");
    expect(result.outputs?.found).toBe(true);
  });

  it("should return default value when path does not exist", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { name: "John" } },
        path: "$.user.email",
        defaultValue: "no-email",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe("no-email");
    expect(result.outputs?.found).toBe(false);
  });

  it("should return default value when value is not a string", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { value: 42 },
        path: "$.value",
        defaultValue: "not-a-string",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe("not-a-string");
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle array paths", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { users: [{ name: "John" }, { name: "Jane" }] },
        path: "$.users[1].name",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe("Jane");
    expect(result.outputs?.found).toBe(true);
  });

  it("should fail with invalid path", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { name: "John" },
        path: null,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing JSONPath expression");
  });

  it("should use empty string as default value when not specified", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { age: 30 } },
        path: "$.user.name",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe("");
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle empty string values", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { name: "" },
        path: "$.name",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe("");
    expect(result.outputs?.found).toBe(true);
  });

  it("should handle string values with special characters", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { text: "Hello\nWorld! 🌍" },
        path: "$.text",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe("Hello\nWorld! 🌍");
    expect(result.outputs?.found).toBe(true);
  });

  it("should return empty string and found=false when JSON input is null", async () => {
    const node = new JsonStringExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: null,
        path: "$.name",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe("");
    expect(result.outputs?.found).toBe(false);
  });
});
