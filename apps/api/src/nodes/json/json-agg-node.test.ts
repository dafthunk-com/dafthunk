import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { JsonAggNode } from "./json-agg-node";

describe("JsonAggNode", () => {
  it("should aggregate single value into array", async () => {
    const nodeId = "json-agg";
    const node = new JsonAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        values: "test",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["test"]);
  });

  it("should aggregate multiple values into array", async () => {
    const nodeId = "json-agg";
    const node = new JsonAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        values: ["a", "b", "c"],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["a", "b", "c"]);
  });

  it("should handle mixed data types", async () => {
    const nodeId = "json-agg";
    const node = new JsonAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        values: ["string", 42, true, { key: "value" }],
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([
      "string",
      42,
      true,
      { key: "value" },
    ]);
  });

  it("should filter out null and undefined values", async () => {
    const nodeId = "json-agg";
    const node = new JsonAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        values: ["a", null, "b", undefined, "c"],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["a", "b", "c"]);
  });

  it("should return empty array for null input", async () => {
    const nodeId = "json-agg";
    const node = new JsonAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        values: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([]);
  });

  it("should return empty array for undefined input", async () => {
    const nodeId = "json-agg";
    const node = new JsonAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        values: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([]);
  });

  it("should handle empty array input", async () => {
    const nodeId = "json-agg";
    const node = new JsonAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        values: [],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([]);
  });
});
