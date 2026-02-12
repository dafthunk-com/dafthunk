import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { JsonObjectAggNode } from "./json-object-agg-node";

describe("JsonObjectAggNode", () => {
  it("should aggregate single object pair", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: { key: "name", value: "John" },
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({ name: "John" });
  });

  it("should aggregate single array pair", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: ["age", 30],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({ age: 30 });
  });

  it("should aggregate multiple pairs", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: [
          { key: "name", value: "John" },
          { key: "age", value: 30 },
          { key: "city", value: "New York" },
        ],
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      name: "John",
      age: 30,
      city: "New York",
    });
  });

  it("should handle mixed pair formats", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: [
          { key: "name", value: "John" },
          ["age", 30],
          { key: "active", value: true },
        ],
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      name: "John",
      age: 30,
      active: true,
    });
  });

  it("should overwrite duplicate keys with later values", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: [
          { key: "name", value: "John" },
          { key: "name", value: "Jane" },
          { key: "age", value: 30 },
        ],
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      name: "Jane",
      age: 30,
    });
  });

  it("should filter out null and undefined pairs", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: [
          { key: "name", value: "John" },
          null,
          { key: "age", value: 30 },
          undefined,
        ],
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      name: "John",
      age: 30,
    });
  });

  it("should return empty object for null input", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({});
  });

  it("should return empty object for undefined input", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({});
  });

  it("should handle empty array input", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: [],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({});
  });

  it("should handle invalid pair format", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: { invalid: "format" },
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle invalid array pair format", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: ["incomplete"],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle mixed valid and invalid pairs", async () => {
    const nodeId = "json-object-agg";
    const node = new JsonObjectAggNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        pairs: [
          { key: "name", value: "John" },
          { invalid: "format" },
          { key: "age", value: 30 },
        ],
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });
});
