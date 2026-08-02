import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JsonExtractAllNode } from "./json-extract-all-node";

describe("JsonExtractAllNode", () => {
  const nodeId = "json-extract-all";
  const node = new JsonExtractAllNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const json = {
    items: [
      { name: "first", qty: 1 },
      { name: "second", qty: 2 },
    ],
    order: { lines: [10, 20, 30] },
  };

  it("extracts every element of an array with [*]", async () => {
    const result = await node.execute(
      createContext({ json, path: "$.items[*]" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual(json.items);
    expect(result.outputs?.count).toBe(2);
    expect(result.outputs?.isValid).toBe(true);
  });

  it("extracts one property from every element with [*].prop", async () => {
    const result = await node.execute(
      createContext({ json, path: "$.items[*].name" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual(["first", "second"]);
    expect(result.outputs?.count).toBe(2);
  });

  it("extracts a nested array with parent.child[*]", async () => {
    const result = await node.execute(
      createContext({ json, path: "$.order.lines[*]" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([10, 20, 30]);
  });

  it("extracts a single value for a plain path", async () => {
    const result = await node.execute(
      createContext({ json, path: "$.items[0].name" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual(["first"]);
    expect(result.outputs?.count).toBe(1);
  });

  it("returns the whole document for the root path", async () => {
    const result = await node.execute(createContext({ json, path: "$" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([json]);
  });

  it("returns nothing for a path that does not match", async () => {
    const result = await node.execute(
      createContext({ json, path: "$.missing[*]" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([]);
    expect(result.outputs?.count).toBe(0);
  });

  it("skips elements that lack the requested property", async () => {
    const result = await node.execute(
      createContext({
        json: { items: [{ name: "a" }, { other: "b" }] },
        path: "$.items[*].name",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual(["a"]);
  });

  it("marks null input as invalid", async () => {
    const result = await node.execute(
      createContext({ json: null, path: "$.a" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.isValid).toBe(false);
    expect(result.outputs?.values).toEqual([]);
  });

  it("returns nothing when no path is given", async () => {
    const result = await node.execute(createContext({ json }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([]);
    expect(result.outputs?.isValid).toBe(true);
  });
});
