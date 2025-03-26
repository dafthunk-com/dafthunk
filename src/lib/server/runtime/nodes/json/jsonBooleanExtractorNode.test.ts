import { describe, it, expect } from "vitest";
import { JsonBooleanExtractorNode } from "./jsonBooleanExtractorNode";
import { Node } from "../../workflowTypes";

describe("JsonBooleanExtractorNode", () => {
  const createNode = (inputs: Record<string, any> = {}): Node => ({
    id: "test-node",
    type: "jsonBooleanExtractor",
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

  it("should extract a boolean value from a simple path", async () => {
    const node = new JsonBooleanExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { isActive: true },
        path: "$.isActive",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(true);
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract a nested boolean value", async () => {
    const node = new JsonBooleanExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { settings: { notifications: false } } },
        path: "$.user.settings.notifications",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(false);
    expect(result.outputs?.found).toBe(true);
  });

  it("should return default value when path does not exist", async () => {
    const node = new JsonBooleanExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { name: "John" } },
        path: "$.user.isActive",
        defaultValue: true,
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(true);
    expect(result.outputs?.found).toBe(false);
  });

  it("should return default value when value is not a boolean", async () => {
    const node = new JsonBooleanExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { isActive: "true" },
        path: "$.isActive",
        defaultValue: false,
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(false);
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle array paths", async () => {
    const node = new JsonBooleanExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { users: [{ active: true }, { active: false }] },
        path: "$.users[0].active",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(true);
    expect(result.outputs?.found).toBe(true);
  });

  it("should fail with invalid JSON input", async () => {
    const node = new JsonBooleanExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: null,
        path: "$.isActive",
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing JSON input");
  });

  it("should fail with invalid path", async () => {
    const node = new JsonBooleanExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { isActive: true },
        path: null,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing JSONPath expression");
  });

  it("should use false as default value when not specified", async () => {
    const node = new JsonBooleanExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { name: "John" } },
        path: "$.user.isActive",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(false);
    expect(result.outputs?.found).toBe(false);
  });
});
