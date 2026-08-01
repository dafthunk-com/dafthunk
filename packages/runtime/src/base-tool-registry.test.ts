/**
 * The tool registry is the switchboard between an LLM's function calls and
 * whatever can service them. The tracker wrapped around it is what makes a
 * model's tool use auditable, so it has to record failed calls just as
 * faithfully as successful ones — a tool that threw is exactly the kind of
 * thing you go looking for afterwards.
 */

import { describe, expect, it, vi } from "vitest";

import { BaseToolRegistry, ToolCallTracker } from "./base-tool-registry";
import type { ToolDefinition, ToolProvider, ToolResult } from "./tool-types";

class TestRegistry extends BaseToolRegistry {
  protected initializeProviders(): void {}
}

const tool = (
  name: string,
  fn?: ToolDefinition["function"]
): ToolDefinition => ({
  name,
  description: `the ${name} tool`,
  parameters: { type: "object", properties: {}, required: [] },
  function: fn ?? (async () => `${name} ran`),
});

/** Provider that answers with a fixed tool and records what it was asked. */
function fakeProvider(over: Partial<ToolProvider> = {}) {
  const asked: string[] = [];
  const provider: ToolProvider = {
    getToolDefinition: async (identifier) => {
      asked.push(identifier);
      return tool(identifier);
    },
    executeTool: async (identifier, parameters): Promise<ToolResult> => ({
      success: true,
      result: { identifier, parameters },
    }),
    ...over,
  };
  return { provider, asked };
}

describe("provider registration", () => {
  it("reports which types it can service", () => {
    const registry = new TestRegistry();
    registry.registerProvider("node", fakeProvider().provider);

    expect(registry.hasProvider("node")).toBe(true);
    expect(registry.hasProvider("mcp")).toBe(false);
    expect(registry.getRegisteredTypes()).toEqual(["node"]);
  });

  it("instantiates a provider from a constructor", () => {
    const registry = new TestRegistry();
    const Ctor = vi.fn(function (this: ToolProvider, _a: string) {
      this.getToolDefinition = async () => tool("t");
      this.executeTool = async () => ({ success: true });
    });

    registry.registerProviderConstructor("node", Ctor as never, "arg");

    expect(Ctor).toHaveBeenCalledWith("arg");
    expect(registry.hasProvider("node")).toBe(true);
  });

  it("lets a later registration replace an earlier one", () => {
    const registry = new TestRegistry();
    registry.registerProvider("node", fakeProvider().provider);
    const second = fakeProvider();
    registry.registerProvider("node", second.provider);

    return registry
      .getToolDefinition({ type: "node", identifier: "x" })
      .then(() => expect(second.asked).toEqual(["x"]));
  });

  it("starts with nothing registered", () => {
    expect(new TestRegistry().getRegisteredTypes()).toEqual([]);
  });
});

describe("dispatch", () => {
  it("routes a definition lookup to the matching provider", async () => {
    const registry = new TestRegistry();
    const { provider, asked } = fakeProvider();
    registry.registerProvider("node", provider);

    const definition = await registry.getToolDefinition({
      type: "node",
      identifier: "adder",
    });

    expect(asked).toEqual(["adder"]);
    expect(definition.name).toBe("adder");
  });

  it("forwards the tool config to the provider", async () => {
    const seen: unknown[] = [];
    const registry = new TestRegistry();
    registry.registerProvider("node", {
      getToolDefinition: async (_id, config) => {
        seen.push(config);
        return tool("t");
      },
      executeTool: async () => ({ success: true }),
    });

    await registry.getToolDefinition({
      type: "node",
      identifier: "t",
      config: { preset: 1 },
    });

    expect(seen).toEqual([{ preset: 1 }]);
  });

  it("names the missing type when nothing is registered for it", async () => {
    const registry = new TestRegistry();

    await expect(
      registry.getToolDefinition({ type: "mcp", identifier: "x" })
    ).rejects.toThrow(/No provider registered for tool type: mcp/);

    await expect(
      registry.executeTool({ type: "mcp", identifier: "x" }, {})
    ).rejects.toThrow(/No provider registered for tool type: mcp/);
  });

  it("passes parameters through on execution", async () => {
    const registry = new TestRegistry();
    registry.registerProvider("node", fakeProvider().provider);

    expect(
      await registry.executeTool(
        { type: "node", identifier: "adder" },
        { a: 1 }
      )
    ).toMatchObject({ success: true, result: { parameters: { a: 1 } } });
  });

  it("resolves several definitions at once, preserving order", async () => {
    const registry = new TestRegistry();
    registry.registerProvider("node", fakeProvider().provider);

    const definitions = await registry.getToolDefinitions([
      { type: "node", identifier: "first" },
      { type: "node", identifier: "second" },
    ]);

    expect(definitions.map((d) => d.name)).toEqual(["first", "second"]);
  });

  it("executes several tools at once, preserving order", async () => {
    const registry = new TestRegistry();
    registry.registerProvider("node", fakeProvider().provider);

    const results = await registry.executeTools([
      { toolRef: { type: "node", identifier: "a" }, parameters: {} },
      { toolRef: { type: "node", identifier: "b" }, parameters: {} },
    ]);

    expect(
      results.map((r) => (r.result as { identifier: string }).identifier)
    ).toEqual(["a", "b"]);
  });

  it("fails a batch when any member fails", async () => {
    const registry = new TestRegistry();
    registry.registerProvider("node", fakeProvider().provider);

    await expect(
      registry.getToolDefinitions([
        { type: "node", identifier: "ok" },
        { type: "missing", identifier: "x" },
      ])
    ).rejects.toThrow(/No provider registered/);
  });
});

describe("listing available tools", () => {
  it("gathers tools from every provider that can list them", async () => {
    const registry = new TestRegistry();
    registry.registerProvider("node", {
      ...fakeProvider().provider,
      listTools: async () => [tool("a"), tool("b")],
    });
    registry.registerProvider("mcp", {
      ...fakeProvider().provider,
      listTools: async () => [tool("c")],
    });

    const all = await registry.getAllAvailableTools();

    expect(all.map((entry) => entry.type)).toEqual(["node", "mcp"]);
    expect(all[0].tools).toHaveLength(2);
  });

  it("skips providers that cannot list", async () => {
    const registry = new TestRegistry();
    registry.registerProvider("node", fakeProvider().provider);

    expect(await registry.getAllAvailableTools()).toEqual([]);
  });

  it("keeps going when one provider's listing throws", async () => {
    // A broken provider must not blank out the catalogue for the others.
    const registry = new TestRegistry();
    registry.registerProvider("broken", {
      ...fakeProvider().provider,
      listTools: async () => {
        throw new Error("provider offline");
      },
    });
    registry.registerProvider("good", {
      ...fakeProvider().provider,
      listTools: async () => [tool("a")],
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const all = await registry.getAllAvailableTools();
      expect(all.map((e) => e.type)).toEqual(["good"]);
    } finally {
      warn.mockRestore();
    }
  });
});

describe("ToolCallTracker", () => {
  it("starts with no recorded calls", () => {
    expect(new ToolCallTracker().getToolCalls()).toEqual([]);
  });

  it("records a successful call with its arguments and result", async () => {
    const tracker = new ToolCallTracker();
    const [wrapped] = tracker.wrapToolDefinitions([
      tool("adder", async () => "7"),
    ]);

    const result = await wrapped.function({ a: 3, b: 4 });

    expect(result).toBe("7");
    expect(tracker.getToolCalls()).toMatchObject([
      { name: "adder", arguments: { a: 3, b: 4 }, result: "7" },
    ]);
  });

  it("records a failed call and still rethrows", async () => {
    // The throw must reach the model so it can react; the record exists for us.
    const tracker = new ToolCallTracker();
    const [wrapped] = tracker.wrapToolDefinitions([
      tool("broken", async () => {
        throw new Error("upstream 500");
      }),
    ]);

    await expect(wrapped.function({})).rejects.toThrow("upstream 500");
    expect(tracker.getToolCalls()).toMatchObject([
      { name: "broken", result: { error: "upstream 500" } },
    ]);
  });

  it("records calls in the order they were made", async () => {
    const tracker = new ToolCallTracker();
    const wrapped = tracker.wrapToolDefinitions([
      tool("first"),
      tool("second"),
    ]);

    await wrapped[1].function({});
    await wrapped[0].function({});

    expect(tracker.getToolCalls().map((c) => c.name)).toEqual([
      "second",
      "first",
    ]);
  });

  it("stamps each call with a timestamp", async () => {
    const tracker = new ToolCallTracker();
    const [wrapped] = tracker.wrapToolDefinitions([tool("t")]);

    await wrapped.function({});
    expect(tracker.getToolCalls()[0].timestamp).toEqual(expect.any(Number));
  });

  it("preserves everything about the tool except its function", async () => {
    const tracker = new ToolCallTracker();
    const original = tool("t");
    const [wrapped] = tracker.wrapToolDefinitions([original]);

    expect(wrapped.name).toBe(original.name);
    expect(wrapped.description).toBe(original.description);
    expect(wrapped.parameters).toEqual(original.parameters);
    expect(wrapped.function).not.toBe(original.function);
  });

  it("hands out a copy, so callers cannot edit the log", async () => {
    const tracker = new ToolCallTracker();
    const [wrapped] = tracker.wrapToolDefinitions([tool("t")]);
    await wrapped.function({});

    tracker.getToolCalls().push({
      name: "forged",
      arguments: {},
      result: null,
      timestamp: 0,
    });

    expect(tracker.getToolCalls()).toHaveLength(1);
  });

  it("clears the log on request", async () => {
    const tracker = new ToolCallTracker();
    const [wrapped] = tracker.wrapToolDefinitions([tool("t")]);
    await wrapped.function({});

    tracker.clearToolCalls();
    expect(tracker.getToolCalls()).toEqual([]);
  });
});
