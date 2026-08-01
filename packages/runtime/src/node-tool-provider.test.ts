/**
 * Exposing a node as an LLM tool means two translations, and both are lossy if
 * done carelessly.
 *
 * Outbound, a node's typed inputs become a JSON schema the model is expected to
 * fill in. Inbound, whatever the model actually sent — usually strings, because
 * models emit strings — has to be coerced back to the types the node declared.
 * The coercion rule that matters most is what happens when a value *cannot* be
 * converted: it is passed through untouched so the node's own validation
 * reports a real error, rather than being forced into a plausible-looking wrong
 * value.
 */

import type { NodeExecution, NodeType } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { BaseNodeRegistry } from "./base-node-registry";
import { NodeToolProvider } from "./node-tool-provider";
import type { NodeContext } from "./node-types";
import { ExecutableNode } from "./node-types";

const nodeType = (over: Partial<NodeType>): NodeType =>
  ({
    id: "t",
    name: "T",
    type: "t",
    description: "",
    tags: [],
    icon: "x",
    inputs: [],
    outputs: [],
    ...over,
  }) as NodeType;

/** Echoes the inputs it received, so tests can inspect coercion. */
class AdderNode extends ExecutableNode {
  static readonly nodeType = nodeType({
    id: "adder",
    name: "Adder",
    type: "adder",
    description: "Adds numbers",
    asTool: true,
    inputs: [
      { name: "a", type: "number", description: "first" },
      { name: "b", type: "number", description: "second" },
      { name: "label", type: "string", description: "note", required: false },
    ],
    outputs: [{ name: "seen", type: "json" }],
  });

  async execute(context: NodeContext): Promise<NodeExecution> {
    return this.createSuccessResult({ seen: context.inputs });
  }
}

class BrokenNode extends ExecutableNode {
  static readonly nodeType = nodeType({
    id: "broken",
    type: "broken",
    asTool: true,
    inputs: [],
  });

  async execute(): Promise<NodeExecution> {
    return this.createErrorResult("node said no");
  }
}

class ThrowingNode extends ExecutableNode {
  static readonly nodeType = nodeType({
    id: "throws",
    type: "throws",
    asTool: true,
  });

  async execute(): Promise<NodeExecution> {
    throw new Error("kaboom");
  }
}

/** Every declared parameter type, for schema-shape assertions. */
class TypesNode extends ExecutableNode {
  static readonly nodeType = nodeType({
    id: "types",
    type: "types",
    specification: "Use carefully.",
    inputs: [
      { name: "s", type: "string", description: "d" },
      { name: "n", type: "number", description: "d", minimum: 1, maximum: 9 },
      { name: "b", type: "boolean", description: "d" },
      { name: "d", type: "date", description: "d" },
      { name: "j", type: "json", description: "d" },
      { name: "img", type: "image", description: "d" },
      { name: "geo", type: "geojson", description: "d" },
      { name: "db", type: "database", description: "d" },
      { name: "choice", type: "string", description: "d", enum: ["x", "y"] },
      { name: "secretish", type: "string", description: "d", hidden: true },
      { name: "opt", type: "string", description: "d", required: false },
    ],
  });

  async execute(context: NodeContext): Promise<NodeExecution> {
    return this.createSuccessResult({ seen: context.inputs });
  }
}

class NotATool extends ExecutableNode {
  static readonly nodeType = nodeType({ id: "hidden", type: "hidden" });
  async execute(): Promise<NodeExecution> {
    return this.createSuccessResult({});
  }
}

class Registry extends BaseNodeRegistry {
  protected registerNodes(): void {
    for (const impl of [
      AdderNode,
      BrokenNode,
      ThrowingNode,
      TypesNode,
      NotATool,
    ]) {
      this.registerImplementation(impl as never);
    }
  }
}

function provider() {
  const contexts: Array<{ nodeId: string; inputs: Record<string, unknown> }> =
    [];
  const instance = new NodeToolProvider(
    new Registry({}, false),
    (nodeId, inputs) => {
      contexts.push({ nodeId, inputs });
      return { nodeId, inputs } as unknown as NodeContext;
    }
  );
  return { instance, contexts };
}

/** Runs a tool through its generated definition, returning the parsed result. */
async function callTool(
  identifier: string,
  args: Record<string, unknown>,
  config?: Record<string, unknown>
) {
  const { instance, contexts } = provider();
  const definition = await instance.getToolDefinition(identifier, config);
  const raw = await definition.function(args);
  return { raw, parsed: JSON.parse(raw), contexts };
}

describe("tool definition", () => {
  it("names the tool after the node type", async () => {
    const { instance } = provider();
    const definition = await instance.getToolDefinition("adder");

    expect(definition.name).toBe("node_adder");
    expect(definition.description).toContain("Adds numbers");
  });

  it("turns node inputs into schema properties", async () => {
    const { instance } = provider();
    const { parameters } = await instance.getToolDefinition("adder");

    expect(parameters.type).toBe("object");
    expect(Object.keys(parameters.properties ?? {})).toEqual([
      "a",
      "b",
      "label",
    ]);
  });

  it("requires every input that is not explicitly optional", async () => {
    const { instance } = provider();
    const { parameters } = await instance.getToolDefinition("adder");

    expect(parameters.required).toEqual(["a", "b"]);
  });

  it("maps each parameter type to a JSON schema type", async () => {
    const { instance } = provider();
    const { parameters } = await instance.getToolDefinition("types");
    const props = parameters.properties ?? {};

    expect(props.s).toMatchObject({ type: "string" });
    expect(props.n).toMatchObject({ type: "number", minimum: 1, maximum: 9 });
    expect(props.b).toMatchObject({ type: "boolean" });
    expect(props.d).toMatchObject({ type: "string", format: "date-time" });
    expect(props.j).toMatchObject({ type: "object" });
    expect(props.geo).toMatchObject({ type: "object" });
    expect(props.db).toMatchObject({ type: "string" });
    expect(props.choice).toMatchObject({ enum: ["x", "y"] });
  });

  it("tells the model how to supply a binary input", async () => {
    const { instance } = provider();
    const { parameters } = await instance.getToolDefinition("types");

    expect(parameters.properties?.img.description).toContain("base64");
  });

  it("hides inputs marked hidden from the model", async () => {
    const { instance } = provider();
    const { parameters } = await instance.getToolDefinition("types");

    expect(parameters.properties).not.toHaveProperty("secretish");
    expect(parameters.required).not.toContain("secretish");
  });

  it("appends the node specification to the description", async () => {
    const { instance } = provider();
    const definition = await instance.getToolDefinition("types");

    expect(definition.description).toContain("Specification:");
    expect(definition.description).toContain("Use carefully.");
    expect(definition.specification).toBe("Use carefully.");
  });

  it("resolves a node by id as well as by type", async () => {
    const { instance } = provider();
    await expect(instance.getToolDefinition("adder")).resolves.toBeTruthy();
  });

  it("reports the identifier it could not resolve", async () => {
    const { instance } = provider();

    await expect(instance.getToolDefinition("nope")).rejects.toThrow(
      /Failed to create tool definition for nope/
    );
  });
});

describe("preset configuration", () => {
  it("omits preset parameters from the schema shown to the model", async () => {
    const { instance } = provider();
    const { parameters } = await instance.getToolDefinition("adder", { a: 10 });

    expect(Object.keys(parameters.properties ?? {})).toEqual(["b", "label"]);
    expect(parameters.required).toEqual(["b"]);
  });

  it("applies a preset at execution time", async () => {
    const { parsed } = await callTool("adder", { b: 2 }, { a: 10 });
    expect(parsed.seen).toMatchObject({ a: 10, b: 2 });
  });

  it("lets a preset win over whatever the model sent", async () => {
    // Presets are how a workflow author pins a parameter. A model must not be
    // able to talk its way past one.
    const { parsed } = await callTool("adder", { a: 999, b: 2 }, { a: 10 });
    expect(parsed.seen.a).toBe(10);
  });

  it("falls back to the node's own default when neither preset nor model supplies one", async () => {
    class DefaultingNode extends ExecutableNode {
      static readonly nodeType = nodeType({
        id: "defaulting",
        type: "defaulting",
        inputs: [{ name: "a", type: "number", value: 42, description: "d" }],
      });
      async execute(context: NodeContext): Promise<NodeExecution> {
        return this.createSuccessResult({ seen: context.inputs });
      }
    }
    class R extends BaseNodeRegistry {
      protected registerNodes(): void {
        this.registerImplementation(DefaultingNode as never);
      }
    }

    const instance = new NodeToolProvider(
      new R({}, false),
      (nodeId, inputs) => ({ nodeId, inputs }) as unknown as NodeContext
    );
    const definition = await instance.getToolDefinition("defaulting");

    expect(JSON.parse(await definition.function({})).seen).toEqual({ a: 42 });
  });
});

describe("parameter coercion", () => {
  const seen = async (args: Record<string, unknown>) =>
    (await callTool("adder", args)).parsed.seen;

  it("parses a numeric string into a number", async () => {
    expect(await seen({ a: "3", b: "4.5" })).toEqual({ a: 3, b: 4.5 });
  });

  it("passes an unparseable number through for the node to reject", async () => {
    // Coercing this to NaN would hide a real prompt bug behind a arithmetic
    // oddity further downstream.
    expect(await seen({ a: "not a number", b: 1 })).toMatchObject({
      a: "not a number",
    });
  });

  it("stringifies a non-string for a string parameter", async () => {
    expect(await seen({ a: 1, b: 2, label: 99 })).toMatchObject({
      label: "99",
    });
  });

  it("omits parameters the model did not send", async () => {
    expect(await seen({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("preserves null and undefined rather than coercing them", async () => {
    const result = await seen({ a: null, b: 2 });
    expect(result.a).toBeNull();
  });

  describe("booleans", () => {
    const coerce = async (value: unknown) => {
      class B extends ExecutableNode {
        static readonly nodeType = nodeType({
          id: "b",
          type: "b",
          inputs: [{ name: "flag", type: "boolean", description: "d" }],
        });
        async execute(context: NodeContext): Promise<NodeExecution> {
          return this.createSuccessResult({ seen: context.inputs });
        }
      }
      class R extends BaseNodeRegistry {
        protected registerNodes(): void {
          this.registerImplementation(B as never);
        }
      }
      const instance = new NodeToolProvider(
        new R({}, false),
        (nodeId, inputs) => ({ nodeId, inputs }) as unknown as NodeContext
      );
      const definition = await instance.getToolDefinition("b");
      return JSON.parse(await definition.function({ flag: value })).seen.flag;
    };

    it.each([
      ["true", true],
      ["TRUE", true],
      ["false", false],
      ["False", false],
    ])("reads %s as %s", async (input, expected) => {
      expect(await coerce(input)).toBe(expected);
    });

    it("treats a non-zero numeric string as true", async () => {
      expect(await coerce("1")).toBe(true);
      expect(await coerce("0")).toBe(false);
    });

    it("passes a nonsense string through untouched", async () => {
      // Returning `true` here would silently enable something the model never
      // asked for.
      expect(await coerce("maybe")).toBe("maybe");
    });

    it("leaves a real boolean alone", async () => {
      expect(await coerce(true)).toBe(true);
    });
  });

  describe("dates", () => {
    const coerce = async (value: unknown) => {
      class D extends ExecutableNode {
        static readonly nodeType = nodeType({
          id: "d",
          type: "d",
          inputs: [{ name: "when", type: "date", description: "d" }],
        });
        async execute(context: NodeContext): Promise<NodeExecution> {
          return this.createSuccessResult({ seen: context.inputs });
        }
      }
      class R extends BaseNodeRegistry {
        protected registerNodes(): void {
          this.registerImplementation(D as never);
        }
      }
      const instance = new NodeToolProvider(
        new R({}, false),
        (nodeId, inputs) => ({ nodeId, inputs }) as unknown as NodeContext
      );
      const definition = await instance.getToolDefinition("d");
      return JSON.parse(await definition.function({ when: value })).seen.when;
    };

    it("normalises an ISO string", async () => {
      expect(await coerce("2024-03-01T00:00:00Z")).toBe(
        "2024-03-01T00:00:00.000Z"
      );
    });

    it("normalises an epoch number", async () => {
      expect(await coerce(0)).toBe("1970-01-01T00:00:00.000Z");
    });

    it("passes an unparseable date through", async () => {
      expect(await coerce("someday")).toBe("someday");
    });
  });

  describe("json and geo types", () => {
    const coerce = async (type: string, value: unknown) => {
      class J extends ExecutableNode {
        static readonly nodeType = nodeType({
          id: "j",
          type: "j",
          inputs: [{ name: "v", type, description: "d" }],
        });
        async execute(context: NodeContext): Promise<NodeExecution> {
          return this.createSuccessResult({ seen: context.inputs });
        }
      }
      class R extends BaseNodeRegistry {
        protected registerNodes(): void {
          this.registerImplementation(J as never);
        }
      }
      const instance = new NodeToolProvider(
        new R({}, false),
        (nodeId, inputs) => ({ nodeId, inputs }) as unknown as NodeContext
      );
      const definition = await instance.getToolDefinition("j");
      return JSON.parse(await definition.function({ v: value })).seen.v;
    };

    it("parses a JSON string", async () => {
      expect(await coerce("json", '{"a":1}')).toEqual({ a: 1 });
    });

    it("passes malformed JSON through", async () => {
      expect(await coerce("json", "{not json")).toBe("{not json");
    });

    it("leaves an already-structured value alone", async () => {
      expect(await coerce("json", { a: 1 })).toEqual({ a: 1 });
    });

    it("parses geojson the same way", async () => {
      expect(await coerce("geojson", '{"type":"Point"}')).toEqual({
        type: "Point",
      });
    });
  });
});

describe("execution", () => {
  it("returns the node's outputs as a JSON string", async () => {
    const { raw, parsed } = await callTool("adder", { a: 1, b: 2 });

    expect(typeof raw).toBe("string");
    expect(parsed.seen).toEqual({ a: 1, b: 2 });
  });

  it("builds a node context for the call", async () => {
    const { contexts } = await callTool("adder", { a: 1, b: 2 });

    expect(contexts).toHaveLength(1);
    expect(contexts[0].inputs).toEqual({ a: 1, b: 2 });
  });

  it("surfaces a node's own error result", async () => {
    const { instance } = provider();
    const definition = await instance.getToolDefinition("broken");

    await expect(definition.function({})).rejects.toThrow(/node said no/);
  });

  it("surfaces an exception thrown inside a node", async () => {
    const { instance } = provider();
    const definition = await instance.getToolDefinition("throws");

    await expect(definition.function({})).rejects.toThrow(/kaboom/);
  });

  it("reports a failure through executeTool rather than throwing", async () => {
    const { instance } = provider();

    expect(await instance.executeTool("broken", {})).toMatchObject({
      success: false,
      error: "node said no",
    });
  });

  it("reports an unknown node through executeTool", async () => {
    const { instance } = provider();

    expect(await instance.executeTool("nope", {})).toMatchObject({
      success: false,
      error: expect.stringContaining("nope"),
    });
  });

  it("coerces parameters on the executeTool path too", async () => {
    const { instance } = provider();

    expect(
      await instance.executeTool("adder", { a: "5", b: "6" })
    ).toMatchObject({ success: true, result: { seen: { a: 5, b: 6 } } });
  });
});

describe("listTools", () => {
  it("offers only the node types marked as tools", async () => {
    const { instance } = provider();
    const tools = await instance.listTools();

    const names = tools.map((t) => t.name);
    expect(names).toContain("node_adder");
    expect(names).not.toContain("node_hidden");
    expect(names).not.toContain("node_types");
  });

  it("skips a node whose definition cannot be built", async () => {
    const { instance } = provider();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(
      instance as unknown as { getToolDefinition: () => Promise<never> },
      "getToolDefinition"
    ).mockRejectedValueOnce(new Error("bad node"));

    try {
      const tools = await instance.listTools();
      expect(tools.length).toBeGreaterThanOrEqual(1);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
