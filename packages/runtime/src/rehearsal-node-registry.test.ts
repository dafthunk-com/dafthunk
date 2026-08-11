import type { Node, NodeExecution, NodeType } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { BaseNodeRegistry } from "./base-node-registry";
import type { NodeContext } from "./node-types";
import { ExecutableNode, MultiStepNode } from "./node-types";
import { RehearsalNodeRegistry } from "./rehearsal-node-registry";

function nodeType(overrides: Partial<NodeType> & { type: string }): NodeType {
  return {
    id: overrides.type,
    name: overrides.type,
    type: overrides.type,
    tags: [],
    icon: "",
    inputs: [],
    outputs: [],
    ...overrides,
  };
}

const INTEGRATION_INPUT = {
  name: "integrationId",
  type: "integration",
  provider: "x",
  required: true,
  hidden: true,
} as NodeType["inputs"][number];

/** An outward write. Its real implementation must never run in a rehearsal. */
class FakeShareNode extends ExecutableNode {
  public static readonly nodeType: NodeType = nodeType({
    type: "share-post-x",
    usage: 20,
    inputs: [
      INTEGRATION_INPUT,
      { name: "text", type: "string", required: true },
    ],
    outputs: [
      { name: "id", type: "string", hidden: true },
      { name: "text", type: "string" },
      { name: "tweet", type: "json", hidden: true },
    ],
  });

  public async execute(): Promise<NodeExecution> {
    throw new Error("a real outward write ran during a rehearsal");
  }
}

/** A provider-backed read — runs real when its integration id is bound. */
class FakeReadNode extends ExecutableNode {
  public static readonly nodeType: NodeType = nodeType({
    type: "get-post-x",
    usage: 5,
    inputs: [INTEGRATION_INPUT],
    outputs: [{ name: "post", type: "json" }],
  });

  public async execute(): Promise<NodeExecution> {
    return this.createSuccessResult({ post: { real: true } }, 7);
  }
}

/** A curated read — its fixture must beat the generic rules. */
class FakeInboxNode extends ExecutableNode {
  public static readonly nodeType: NodeType = nodeType({
    type: "read-inbox-google-mail",
    inputs: [
      {
        ...INTEGRATION_INPUT,
        provider: "google-mail",
      } as NodeType["inputs"][number],
    ],
    outputs: [
      { name: "messages", type: "json" },
      { name: "count", type: "number", hidden: true },
    ],
  });

  public async execute(): Promise<NodeExecution> {
    throw new Error("a real inbox read ran without a bound integration");
  }
}

/** Ordinary compute — a rehearsal must not touch it. */
class FakeMathNode extends ExecutableNode {
  public static readonly nodeType: NodeType = nodeType({
    type: "addition",
    outputs: [{ name: "result", type: "number" }],
  });

  public async execute(): Promise<NodeExecution> {
    return this.createSuccessResult({ result: 3 });
  }
}

/** Multi-step compute, to show `isMultiStep` still delegates. */
class FakeCrawlNode extends MultiStepNode {
  public static readonly nodeType: NodeType = nodeType({ type: "crawl" });

  public async execute(): Promise<NodeExecution> {
    return this.createSuccessResult({});
  }
}

class TestRegistry extends BaseNodeRegistry<undefined> {
  protected registerNodes(): void {
    this.registerImplementation(FakeShareNode);
    this.registerImplementation(FakeReadNode);
    this.registerImplementation(FakeInboxNode);
    this.registerImplementation(FakeMathNode);
    this.registerImplementation(FakeCrawlNode);
  }
}

function makeNode(type: string): Node {
  return {
    id: `node-${type}`,
    name: type,
    type,
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  };
}

function context(inputs: Record<string, unknown>): NodeContext {
  return { inputs } as unknown as NodeContext;
}

function rehearsal(): RehearsalNodeRegistry<undefined> {
  return new RehearsalNodeRegistry(
    new TestRegistry(undefined, true),
    undefined
  );
}

describe("RehearsalNodeRegistry", () => {
  it("stubs an outward write even when its integration is bound", async () => {
    const executable = rehearsal().createExecutableNode(
      makeNode("share-post-x")
    );

    const result = await executable?.execute(
      context({ integrationId: "int-1", text: "Hello world" })
    );

    expect(result?.status).toBe("completed");
    expect(result?.usage).toBe(0);
  });

  it("echoes composed inputs and synthesizes receipts on declared ports", async () => {
    const executable = rehearsal().createExecutableNode(
      makeNode("share-post-x")
    );

    const result = await executable?.execute(
      context({ integrationId: "int-1", text: "Hello world" })
    );

    expect(result?.outputs).toEqual({
      id: "rehearsal-id",
      text: "Hello world",
      tweet: { rehearsal: true },
    });
  });

  it("delegates a read whose integration id is bound", async () => {
    const executable = rehearsal().createExecutableNode(makeNode("get-post-x"));

    const result = await executable?.execute(
      context({ integrationId: "int-1" })
    );

    expect(result?.outputs).toEqual({ post: { real: true } });
    // The real node's own usage survives delegation.
    expect(result?.usage).toBe(7);
  });

  it("stubs a read whose integration id is unbound", async () => {
    const executable = rehearsal().createExecutableNode(makeNode("get-post-x"));

    const result = await executable?.execute(context({}));

    expect(result?.status).toBe("completed");
    expect(result?.usage).toBe(0);
    expect(result?.outputs).toEqual({ post: { rehearsal: true } });
  });

  it("prefers the curated fixture over the generic rules", async () => {
    const executable = rehearsal().createExecutableNode(
      makeNode("read-inbox-google-mail")
    );

    const result = await executable?.execute(context({}));

    expect(result?.outputs?.count).toBe(2);
    const messages = result?.outputs?.messages as Array<{ subject: string }>;
    expect(messages).toHaveLength(2);
    expect(messages[0].subject).toBeTruthy();
  });

  it("leaves ordinary compute untouched", async () => {
    const registry = rehearsal();
    const executable = registry.createExecutableNode(makeNode("addition"));

    expect(executable).toBeInstanceOf(FakeMathNode);
  });

  it("reports outward stubs as single-step and delegates the rest", () => {
    const registry = rehearsal();

    expect(registry.isMultiStep("share-post-x")).toBe(false);
    expect(registry.isMultiStep("crawl")).toBe(true);
    expect(registry.isMultiStep("addition")).toBe(false);
  });

  it("delegates the catalog", () => {
    const registry = rehearsal();

    expect(registry.getNodeTypes()).toHaveLength(5);
    expect(registry.getNodeType("get-post-x").usage).toBe(5);
  });

  it("treats unknown types exactly as the inner registry does", () => {
    const registry = rehearsal();

    expect(registry.createExecutableNode(makeNode("mystery"))).toBeUndefined();
    expect(() => registry.getNodeType("mystery")).toThrow(
      "Node type not found"
    );
  });
});
