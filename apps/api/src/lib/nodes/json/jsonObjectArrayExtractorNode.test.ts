import { describe, it, expect } from "vitest";
import { Node } from "../../api/types";
import { JsonObjectArrayExtractorNode } from "./jsonObjectArrayExtractorNode";
import { NodeContext } from "../types";
import { vi } from "vitest";

describe("JsonJsonExtractorNode", () => {
  const createNode = (inputs: Record<string, any> = {}): Node => ({
    id: "test-node",
    type: "jsonJsonExtractor",
    name: "Test Node",
    inputs: [],
    outputs: [],
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

  it("should extract a JSON object from a simple path", async () => {
    const node = new JsonObjectArrayExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { name: "John", age: 30 } },
        path: "$.user",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toEqual({ name: "John", age: 30 });
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract a nested JSON object", async () => {
    const node = new JsonObjectArrayExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { profile: { settings: { theme: "dark" } } } },
        path: "$.user.profile.settings",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toEqual({ theme: "dark" });
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract an array", async () => {
    const node = new JsonObjectArrayExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { items: [1, 2, 3] },
        path: "$.items",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toEqual([1, 2, 3]);
    expect(result.outputs?.found).toBe(true);
  });

  it("should return default value when path does not exist", async () => {
    const defaultValue = { empty: true };
    const node = new JsonObjectArrayExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { name: "John" } },
        path: "$.user.settings",
        defaultValue,
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toEqual(defaultValue);
    expect(result.outputs?.found).toBe(false);
  });

  it("should return default value when value is not a JSON object or array", async () => {
    const node = new JsonObjectArrayExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { value: "string" },
        path: "$.value",
        defaultValue: { empty: true },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toEqual({ empty: true });
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle array paths", async () => {
    const node = new JsonObjectArrayExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { users: [{ profile: { role: "admin" } }] },
        path: "$.users[0].profile",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toEqual({ role: "admin" });
    expect(result.outputs?.found).toBe(true);
  });

  it("should fail with invalid JSON input", async () => {
    const node = new JsonObjectArrayExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: null,
        path: "$.value",
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing JSON input");
  });

  it("should fail with invalid path", async () => {
    const node = new JsonObjectArrayExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { value: {} },
        path: null,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing JSONPath expression");
  });

  it("should use empty object as default value when not specified", async () => {
    const node = new JsonObjectArrayExtractorNode(createNode());
    const result = await node.execute(
      createContext({
        json: { user: { name: "John" } },
        path: "$.user.settings",
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toEqual({});
    expect(result.outputs?.found).toBe(false);
  });
});
