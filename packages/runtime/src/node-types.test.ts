/**
 * ExecutableNode is the base class all 460-odd nodes extend, so its helpers are
 * the most-executed code in the package. They are also the code most likely to
 * be relied on without being read: `create` builds the node definitions used by
 * templates and tests, and the blob helpers decide whether a value is treated
 * as binary data or as an opaque reference.
 */

import type { NodeExecution, NodeType } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import type { BaseToolRegistry } from "./base-tool-registry";
import type { NodeContext } from "./node-types";
import {
  ExecutableNode,
  isBlobParameter,
  isObjectReference,
  toUint8Array,
} from "./node-types";

class SampleNode extends ExecutableNode {
  static readonly nodeType = {
    id: "sample",
    name: "Sample",
    type: "sample",
    description: "A sample node",
    tags: ["Test"],
    icon: "beaker",
    inputs: [
      { name: "a", type: "number" },
      { name: "b", type: "string", value: "default-b" },
    ],
    outputs: [{ name: "result", type: "number" }],
  } as NodeType;

  async execute(): Promise<NodeExecution> {
    return this.createSuccessResult({ result: 1 });
  }

  // Exposed for testing the protected helper.
  collect(inputs: Record<string, unknown>, prefix: string) {
    return this.collectDynamicInputs(inputs, prefix);
  }
}

const instance = () =>
  new SampleNode(SampleNode.create({ id: "n1", position: { x: 1, y: 2 } }));

describe("ExecutableNode.create", () => {
  it("builds a node definition from the node type", () => {
    const node = SampleNode.create({ id: "n1", position: { x: 1, y: 2 } });

    expect(node).toMatchObject({
      id: "n1",
      type: "sample",
      name: "Sample",
      description: "A sample node",
      icon: "beaker",
      position: { x: 1, y: 2 },
    });
  });

  it("copies the declared inputs and outputs", () => {
    const node = SampleNode.create({ id: "n1", position: { x: 0, y: 0 } });

    expect(node.inputs.map((i) => i.name)).toEqual(["a", "b"]);
    expect(node.outputs.map((o) => o.name)).toEqual(["result"]);
  });

  it("lets the caller override a name and description", () => {
    const node = SampleNode.create({
      id: "n1",
      position: { x: 0, y: 0 },
      name: "Custom",
      description: "Custom description",
    });

    expect(node.name).toBe("Custom");
    expect(node.description).toBe("Custom description");
  });

  it("applies input value overrides", () => {
    const node = SampleNode.create({
      id: "n1",
      position: { x: 0, y: 0 },
      inputs: { a: 42 },
    });

    expect(node.inputs.find((i) => i.name === "a")?.value).toBe(42);
  });

  it("keeps a declared default when no override is given", () => {
    const node = SampleNode.create({ id: "n1", position: { x: 0, y: 0 } });

    expect(node.inputs.find((i) => i.name === "b")?.value).toBe("default-b");
  });

  it("ignores an override for an input the node does not declare", () => {
    const node = SampleNode.create({
      id: "n1",
      position: { x: 0, y: 0 },
      inputs: { nonexistent: 1 },
    });

    expect(node.inputs.map((i) => i.name)).toEqual(["a", "b"]);
  });

  it("does not alias the node type's parameter objects", () => {
    // Two nodes created from the same type must not share input objects, or
    // setting a value on one would silently change the other.
    const first = SampleNode.create({ id: "a", position: { x: 0, y: 0 } });
    const second = SampleNode.create({ id: "b", position: { x: 0, y: 0 } });

    first.inputs[0].value = 99;

    expect(second.inputs[0].value).toBeUndefined();
    expect(SampleNode.nodeType.inputs[0].value).toBeUndefined();
  });
});

describe("result helpers", () => {
  it("builds a success result carrying the node id", () => {
    expect(instance().createSuccessResult({ result: 5 })).toMatchObject({
      nodeId: "n1",
      status: "completed",
      outputs: { result: 5 },
    });
  });

  it("defaults usage to one when the node type declares none", () => {
    expect(instance().createSuccessResult({}).usage).toBe(1);
  });

  it("prefers an explicitly reported usage", () => {
    expect(instance().createSuccessResult({}, 7).usage).toBe(7);
  });

  it("builds an error result with zero usage by default", () => {
    expect(instance().createErrorResult("nope")).toMatchObject({
      nodeId: "n1",
      status: "error",
      error: "nope",
      usage: 0,
    });
  });

  it("records usage burned before an error", () => {
    expect(instance().createErrorResult("nope", 3).usage).toBe(3);
  });
});

describe("collectDynamicInputs", () => {
  const node = () => instance();

  it("collects prefixed inputs in numeric order", () => {
    expect(
      node().collect({ item_1: "a", item_2: "b", item_3: "c" }, "item")
    ).toEqual(["a", "b", "c"]);
  });

  it("orders numerically rather than lexicographically", () => {
    // Sorting as text would put item_10 before item_2.
    expect(
      node().collect({ item_2: "b", item_10: "j", item_1: "a" }, "item")
    ).toEqual(["a", "b", "j"]);
  });

  it("ignores keys that do not match the prefix", () => {
    expect(
      node().collect({ item_1: "a", other_1: "x", item: "y" }, "item")
    ).toEqual(["a"]);
  });

  it("ignores a non-numeric suffix", () => {
    expect(node().collect({ item_1: "a", item_abc: "x" }, "item")).toEqual([
      "a",
    ]);
  });

  it("drops null and undefined values", () => {
    expect(
      node().collect(
        { item_1: "a", item_2: null, item_3: undefined, item_4: "d" },
        "item"
      )
    ).toEqual(["a", "d"]);
  });

  it("keeps falsy values that are not null", () => {
    expect(
      node().collect({ item_1: 0, item_2: "", item_3: false }, "item")
    ).toEqual([0, "", false]);
  });

  it("returns nothing when no key matches", () => {
    expect(node().collect({ other: 1 }, "item")).toEqual([]);
  });

  it("does not confuse a prefix that is a prefix of another", () => {
    expect(node().collect({ item_1: "a", item_extra_1: "x" }, "item")).toEqual([
      "a",
    ]);
  });
});

describe("blob and reference helpers", () => {
  describe("isObjectReference", () => {
    it("accepts an id and mime type with no data", () => {
      expect(isObjectReference({ id: "o1", mimeType: "image/png" })).toBe(true);
    });

    it("rejects a value that carries data, which is a blob not a reference", () => {
      expect(
        isObjectReference({
          id: "o1",
          mimeType: "image/png",
          data: new Uint8Array(),
        })
      ).toBe(false);
    });

    it.each([
      ["null", null],
      ["undefined", undefined],
      ["a string", "o1"],
      ["a partial object", { id: "o1" }],
      ["non-string fields", { id: 1, mimeType: 2 }],
    ])("rejects %s", (_label, value) => {
      expect(isObjectReference(value)).toBe(false);
    });
  });

  describe("isBlobParameter", () => {
    it("accepts a native Uint8Array payload", () => {
      expect(
        isBlobParameter({ data: new Uint8Array([1]), mimeType: "image/png" })
      ).toBe(true);
    });

    it("accepts a JSON-serialized Uint8Array", () => {
      // Binary crossing a durable-step boundary comes back as numeric keys.
      expect(
        isBlobParameter({ data: { 0: 1, 1: 2 }, mimeType: "image/png" })
      ).toBe(true);
    });

    it("rejects an empty serialized object", () => {
      expect(isBlobParameter({ data: {}, mimeType: "image/png" })).toBe(false);
    });

    it("rejects an object with non-numeric keys", () => {
      expect(isBlobParameter({ data: { a: 1 }, mimeType: "image/png" })).toBe(
        false
      );
    });

    it.each([
      ["null", null],
      ["a string", "blob"],
      ["a reference", { id: "o1", mimeType: "image/png" }],
      ["a missing mime type", { data: new Uint8Array() }],
    ])("rejects %s", (_label, value) => {
      expect(isBlobParameter(value)).toBe(false);
    });
  });

  describe("toUint8Array", () => {
    it("returns a native array unchanged", () => {
      const data = new Uint8Array([1, 2, 3]);
      expect(toUint8Array(data)).toBe(data);
    });

    it("rebuilds a serialized array in index order", () => {
      expect([...toUint8Array({ 2: 3, 0: 1, 1: 2 })]).toEqual([1, 2, 3]);
    });

    it("handles an empty serialized array", () => {
      expect(toUint8Array({}).length).toBe(0);
    });

    it("orders indices numerically past ten", () => {
      const serialized: Record<string, number> = {};
      for (let i = 0; i < 12; i++) serialized[i] = i;

      expect([...toUint8Array(serialized)]).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
      ]);
    });
  });
});

describe("tool reference resolution", () => {
  const toolRegistry = {
    getToolDefinitions: vi.fn(async () => [
      {
        name: "node_x",
        description: "d",
        parameters: { type: "object", properties: {}, required: [] },
        function: async () => "ok",
      },
    ]),
  } as unknown as BaseToolRegistry;

  const context = (registry?: BaseToolRegistry) =>
    ({ toolRegistry: registry }) as NodeContext;

  it("resolves references through the registry", async () => {
    const tools = await instance().convertFunctionCallsToToolDefinitions(
      [{ type: "node", identifier: "x" }],
      context(toolRegistry)
    );

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("node_x");
  });

  it("returns nothing for an empty reference list", async () => {
    expect(
      await instance().convertFunctionCallsToToolDefinitions(
        [],
        context(toolRegistry)
      )
    ).toEqual([]);
  });

  it("returns nothing when no registry is available", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(
        await instance().convertFunctionCallsToToolDefinitions(
          [{ type: "node", identifier: "x" }],
          context(undefined)
        )
      ).toEqual([]);
    } finally {
      warn.mockRestore();
    }
  });

  it("returns nothing rather than throwing on a malformed reference", async () => {
    // A bad tool reference should cost the model its tools, not crash the node.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(
        await instance().convertFunctionCallsToToolDefinitions(
          [{ bogus: true } as never],
          context(toolRegistry)
        )
      ).toEqual([]);
    } finally {
      error.mockRestore();
    }
  });

  it("reshapes definitions into Gemini function declarations", async () => {
    const declarations =
      await instance().convertFunctionCallsToGeminiDeclarations(
        [{ type: "node", identifier: "x" }],
        context(toolRegistry)
      );

    expect(declarations).toEqual([
      {
        name: "node_x",
        description: "d",
        parameters: { type: "object", properties: {}, required: [] },
      },
    ]);
    // The executable function is deliberately dropped for Gemini's format.
    expect(declarations[0]).not.toHaveProperty("function");
  });
});
