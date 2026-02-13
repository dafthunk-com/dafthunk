import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { AggregateItemsNode } from "./aggregate-items-node";

describe("AggregateItemsNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "aggregate-items",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should aggregate multiple string values", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["a", "b", "c"] })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["a", "b", "c"]);
    expect(result.outputs?.count).toBe(3);
  });

  it("should aggregate multiple number values", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: [1, 2, 3, 4, 5] })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([1, 2, 3, 4, 5]);
    expect(result.outputs?.count).toBe(5);
  });

  it("should aggregate mixed type values", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: ["string", 42, true, { key: "value" }] })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([
      "string",
      42,
      true,
      { key: "value" },
    ]);
    expect(result.outputs?.count).toBe(4);
  });

  it("should wrap single value in array", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(createContext({ values: "single" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["single"]);
    expect(result.outputs?.count).toBe(1);
  });

  it("should wrap single object in array", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const obj = { name: "test", value: 42 };
    const result = await node.execute(createContext({ values: obj }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([obj]);
    expect(result.outputs?.count).toBe(1);
  });

  it("should wrap single number in array", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(createContext({ values: 42 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([42]);
    expect(result.outputs?.count).toBe(1);
  });

  it("should return empty array for null input", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(createContext({ values: null }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([]);
    expect(result.outputs?.count).toBe(0);
  });

  it("should return empty array for undefined input", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(createContext({ values: undefined }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([]);
    expect(result.outputs?.count).toBe(0);
  });

  it("should return empty array for missing input", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([]);
    expect(result.outputs?.count).toBe(0);
  });

  it("should handle empty array input", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(createContext({ values: [] }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([]);
    expect(result.outputs?.count).toBe(0);
  });

  it("should preserve null values in array", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: [null, "b", null] })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([null, "b", null]);
    expect(result.outputs?.count).toBe(3);
  });

  it("should preserve undefined values in array", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ values: [undefined, "b", undefined] })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([undefined, "b", undefined]);
    expect(result.outputs?.count).toBe(3);
  });

  it("should handle nested arrays", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        values: [
          [1, 2],
          [3, 4],
        ],
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(result.outputs?.count).toBe(2);
  });

  it("should handle large arrays", async () => {
    const node = new AggregateItemsNode({
      nodeId: "aggregate-items",
    } as unknown as Node);
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);
    const result = await node.execute(createContext({ values: largeArray }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(largeArray);
    expect(result.outputs?.count).toBe(1000);
  });
});
