import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ExtractItemNode } from "./extract-item-node";

describe("ExtractItemNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "extract-item",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should extract item at index 0", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b", "c"], index: 0 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("a");
  });

  it("should extract item at middle index", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b", "c"], index: 1 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("b");
  });

  it("should extract last item with positive index", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b", "c"], index: 2 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("c");
  });

  it("should extract last item with negative index -1", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b", "c"], index: -1 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("c");
  });

  it("should extract second to last item with negative index -2", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b", "c"], index: -2 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("b");
  });

  it("should handle single value input", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: "single", index: 0 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("single");
  });

  it("should extract object from array", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const obj = { name: "test", value: 42 };
    const result = await node.execute(
      createContext({ values: [obj, { other: "item" }], index: 0 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(obj);
  });

  it("should extract number from array", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: [10, 20, 30], index: 1 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(20);
  });

  it("should return error for missing values", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(createContext({ index: 0 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("No values provided");
  });

  it("should return error for missing index", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(createContext({ values: ["a", "b"] }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Index is required");
  });

  it("should return error for non-integer index", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b"], index: 1.5 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Index must be an integer");
  });

  it("should return error for string index", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b"], index: "0" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Index must be an integer");
  });

  it("should return error for index out of bounds (positive)", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b", "c"], index: 5 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("out of bounds");
    expect(result.error).toContain("length 3");
  });

  it("should return error for index out of bounds (negative)", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b", "c"], index: -5 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("out of bounds");
  });

  it("should return error for empty array", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(createContext({ values: [], index: 0 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("empty array");
  });

  it("should handle null values in array", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: [null, "b", "c"], index: 0 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(null);
  });

  it("should handle undefined values in array", async () => {
    const node = new ExtractItemNode({
      nodeId: "extract-item",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: [undefined, "b", "c"], index: 0 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(undefined);
  });
});
