/**
 * The executor decides what a node actually receives. Input collection is the
 * fiddly part: values arrive from a node's own configured defaults and from any
 * number of upstream edges, and whether several edges into one input become an
 * array or overwrite each other depends on the parameter being declared
 * `repeated`. Getting that wrong hands a node an array where it expects a
 * scalar, which fails somewhere far from here.
 */

import type { NodeExecution, NodeType, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  buildTestDependencies,
  emptyState,
  InMemoryObjectStore,
} from "./__test-stubs__/runtime-harness";
import { BaseNodeRegistry } from "./base-node-registry";
import { ExecutionGraph } from "./execution-graph";
import type {
  ExecutionState,
  WorkflowExecutionContext,
} from "./execution-types";
import { NodeExecutor, type StepPrimitives } from "./node-executor";
import type { MultiStepNodeContext, NodeContext } from "./node-types";
import { ExecutableNode, MultiStepNode } from "./node-types";

const type = (over: Partial<NodeType>): NodeType =>
  ({
    id: "t",
    name: "t",
    type: "t",
    description: "",
    tags: [],
    icon: "x",
    inputs: [],
    outputs: [],
    ...over,
  }) as NodeType;

/** Echoes its single `value` input straight back out. */
class EchoNode extends ExecutableNode {
  static readonly nodeType = type({
    id: "echo",
    type: "echo",
    inputs: [{ name: "value", type: "json" }],
    outputs: [{ name: "value", type: "json" }],
  });

  async execute(context: NodeContext): Promise<NodeExecution> {
    return this.createSuccessResult({ value: context.inputs.value });
  }
}

/** Gathers a repeated `items` input and reports what it saw. */
class CollectorNode extends ExecutableNode {
  static readonly nodeType = type({
    id: "collector",
    type: "collector",
    inputs: [{ name: "items", type: "json", repeated: true }],
    outputs: [{ name: "items", type: "json" }],
  });

  async execute(context: NodeContext): Promise<NodeExecution> {
    return this.createSuccessResult({ items: context.inputs.items });
  }
}

class SubscriptionNode extends ExecutableNode {
  static readonly nodeType = type({
    id: "premium",
    type: "premium",
    outputs: [{ name: "value", type: "json" }],
  });

  async execute(): Promise<NodeExecution> {
    return this.createSuccessResult({ value: "premium" });
  }
}

class ThrowingNode extends ExecutableNode {
  static readonly nodeType = type({ id: "throws", type: "throws" });

  async execute(): Promise<NodeExecution> {
    throw new Error("node blew up");
  }
}

class FailingNode extends ExecutableNode {
  static readonly nodeType = type({ id: "fails", type: "fails" });

  async execute(): Promise<NodeExecution> {
    return this.createErrorResult("declined", 4);
  }
}

class ParkingNode extends ExecutableNode {
  static readonly nodeType = type({ id: "parks", type: "parks" });

  async execute(): Promise<NodeExecution> {
    return {
      nodeId: this.node.id,
      status: "pending",
      pendingEvent: { type: "form-response-x" },
    } as NodeExecution;
  }
}

class CostlyNode extends ExecutableNode {
  static readonly nodeType = type({
    id: "costly",
    type: "costly",
    usage: 9,
    outputs: [{ name: "value", type: "json" }],
  });

  async execute(): Promise<NodeExecution> {
    // No explicit usage — the node type's default should apply.
    return {
      nodeId: this.node.id,
      status: "completed",
      outputs: { value: 1 },
    } as NodeExecution;
  }
}

/** Records the step names the runtime hands it. */
class SteppingNode extends MultiStepNode {
  static readonly nodeType = type({
    id: "stepping",
    type: "stepping",
    outputs: [{ name: "value", type: "json" }],
  });

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const a = await context.doStep(async () => 1);
    await context.sleep(10);
    const b = await context.doStep(async () => a + 1);
    return this.createSuccessResult({ value: b });
  }
}

class TestRegistry extends BaseNodeRegistry {
  protected registerNodes(): void {
    for (const impl of [
      EchoNode,
      CollectorNode,
      SubscriptionNode,
      ThrowingNode,
      FailingNode,
      ParkingNode,
      CostlyNode,
      SteppingNode,
    ]) {
      this.registerImplementation(impl as never);
    }
  }
}

interface Built {
  executor: NodeExecutor;
  graph: ExecutionGraph;
  context: WorkflowExecutionContext;
  state: ExecutionState;
  steps: string[];
}

/**
 * Assembles an executor over a hand-built workflow. `nodes` describes each
 * node's type and any configured input defaults; `edges` wires them together.
 */
function build(options: {
  nodes: Array<{
    id: string;
    type: string;
    inputs?: Array<{
      name: string;
      type: string;
      repeated?: boolean;
      value?: unknown;
    }>;
    outputs?: Array<{ name: string; type: string; repeated?: boolean }>;
  }>;
  edges?: Workflow["edges"];
  state?: Partial<ExecutionState>;
}): Built {
  const workflow = {
    id: "wf",
    name: "wf",
    trigger: "manual",
    nodes: options.nodes.map((n) => ({
      id: n.id,
      name: n.id,
      type: n.type,
      position: { x: 0, y: 0 },
      inputs: n.inputs ?? [],
      outputs: n.outputs ?? [{ name: "value", type: "json" }],
    })),
    edges: options.edges ?? [],
  } as Workflow;

  const steps: string[] = [];
  const primitives: StepPrimitives = {
    sleep: async (name) => {
      steps.push(`sleep:${name}`);
    },
    doStep: async (name, fn) => {
      steps.push(`do:${name}`);
      return fn();
    },
  };

  const deps = buildTestDependencies({
    nodeRegistry: new TestRegistry({}, false),
    objectStore: new InMemoryObjectStore(),
  });

  return {
    executor: new NodeExecutor({}, deps, primitives, false),
    graph: ExecutionGraph.build(workflow),
    context: {
      workflow,
      workflowId: "wf",
      organizationId: "org-1",
      executionId: "exec-1",
      trigger: {},
    },
    state: emptyState(options.state),
    steps,
  };
}

const run = (b: Built, nodeId: string) =>
  b.executor.execute(b.context, b.graph, b.state, nodeId);

describe("input collection", () => {
  it("uses a value configured on the node itself", async () => {
    const b = build({
      nodes: [
        {
          id: "a",
          type: "echo",
          inputs: [{ name: "value", type: "json", value: "configured" }],
        },
      ],
    });

    expect(await run(b, "a")).toMatchObject({
      status: "completed",
      outputs: { value: "configured" },
    });
  });

  it("prefers an upstream edge over the configured default", async () => {
    const b = build({
      nodes: [
        { id: "src", type: "echo" },
        {
          id: "dst",
          type: "echo",
          inputs: [{ name: "value", type: "json", value: "default" }],
        },
      ],
      edges: [
        {
          source: "src",
          sourceOutput: "value",
          target: "dst",
          targetInput: "value",
        },
      ],
      state: {
        executedNodes: ["src"],
        nodeOutputs: { src: { value: "wired" } },
      },
    });

    expect(await run(b, "dst")).toMatchObject({
      outputs: { value: "wired" },
    });
  });

  it("gathers several edges into a repeated input", async () => {
    const b = build({
      nodes: [
        { id: "a", type: "echo" },
        { id: "b", type: "echo" },
        {
          id: "c",
          type: "collector",
          inputs: [{ name: "items", type: "json", repeated: true }],
          outputs: [{ name: "items", type: "json" }],
        },
      ],
      edges: [
        {
          source: "a",
          sourceOutput: "value",
          target: "c",
          targetInput: "items",
        },
        {
          source: "b",
          sourceOutput: "value",
          target: "c",
          targetInput: "items",
        },
      ],
      state: {
        executedNodes: ["a", "b"],
        nodeOutputs: { a: { value: "first" }, b: { value: "second" } },
      },
    });

    expect(await run(b, "c")).toMatchObject({
      outputs: { items: ["first", "second"] },
    });
  });

  it("flattens an upstream array into a repeated input", async () => {
    const b = build({
      nodes: [
        { id: "a", type: "echo" },
        {
          id: "c",
          type: "collector",
          inputs: [{ name: "items", type: "json", repeated: true }],
          outputs: [{ name: "items", type: "json" }],
        },
      ],
      edges: [
        {
          source: "a",
          sourceOutput: "value",
          target: "c",
          targetInput: "items",
        },
      ],
      state: {
        executedNodes: ["a"],
        nodeOutputs: { a: { value: ["x", "y"] } },
      },
    });

    expect(await run(b, "c")).toMatchObject({
      outputs: { items: ["x", "y"] },
    });
  });

  it("gives a non-repeated input the last edge's value", async () => {
    const b = build({
      nodes: [
        { id: "a", type: "echo" },
        { id: "b", type: "echo" },
        { id: "c", type: "echo", inputs: [{ name: "value", type: "json" }] },
      ],
      edges: [
        {
          source: "a",
          sourceOutput: "value",
          target: "c",
          targetInput: "value",
        },
        {
          source: "b",
          sourceOutput: "value",
          target: "c",
          targetInput: "value",
        },
      ],
      state: {
        executedNodes: ["a", "b"],
        nodeOutputs: { a: { value: "first" }, b: { value: "second" } },
      },
    });

    expect(await run(b, "c")).toMatchObject({
      outputs: { value: "second" },
    });
  });

  it("ignores an edge whose upstream output is absent", async () => {
    const b = build({
      nodes: [
        { id: "a", type: "echo" },
        {
          id: "c",
          type: "echo",
          inputs: [{ name: "value", type: "json", value: "fallback" }],
        },
        { id: "live", type: "echo" },
      ],
      edges: [
        {
          source: "a",
          sourceOutput: "value",
          target: "c",
          targetInput: "value",
        },
        {
          source: "live",
          sourceOutput: "value",
          target: "c",
          targetInput: "other",
        },
      ],
      state: {
        executedNodes: ["a", "live"],
        // `a` ran but produced nothing on `value`; the configured default stands.
        nodeOutputs: { a: {}, live: { value: 1 } },
      },
    });

    expect(await run(b, "c")).toMatchObject({
      outputs: { value: "fallback" },
    });
  });

  it("reports the collected inputs on the result", async () => {
    const b = build({
      nodes: [
        {
          id: "a",
          type: "echo",
          inputs: [{ name: "value", type: "json", value: "seen" }],
        },
      ],
    });

    expect(await run(b, "a")).toMatchObject({ inputs: { value: "seen" } });
  });

  it("does not mutate execution state", async () => {
    const b = build({
      nodes: [
        {
          id: "a",
          type: "echo",
          inputs: [{ name: "value", type: "json", value: 1 }],
        },
      ],
    });

    await run(b, "a");

    expect(b.state.executedNodes).toEqual([]);
    expect(b.state.nodeInputs).toEqual({});
    expect(b.state.nodeOutputs).toEqual({});
  });
});

describe("resolution failures", () => {
  it("errors on a node type the registry does not know", async () => {
    const b = build({ nodes: [{ id: "a", type: "does-not-exist" }] });

    expect(await run(b, "a")).toMatchObject({
      status: "error",
      error: expect.stringContaining("does-not-exist"),
    });
  });

  it("errors when a node id is not in the graph", async () => {
    const b = build({ nodes: [{ id: "a", type: "echo" }] });

    expect(await run(b, "ghost")).toMatchObject({
      status: "error",
      error: expect.stringContaining("ghost"),
    });
  });

  it("runs every node regardless of plan", async () => {
    // Capability is not gated. Credits are the limit — a trial ends when they
    // run out, which is a real constraint that scales with what someone
    // actually uses, and withholding whole node families on top of that was
    // tried and did not drive upgrades.
    const b = build({ nodes: [{ id: "a", type: "premium" }] });

    expect(await run(b, "a")).toMatchObject({ status: "completed" });
  });
});

describe("node outcomes", () => {
  it("captures an exception thrown inside a node", async () => {
    const b = build({ nodes: [{ id: "a", type: "throws" }] });

    expect(await run(b, "a")).toMatchObject({
      status: "error",
      error: "node blew up",
    });
  });

  it("passes through a node's own error result and its usage", async () => {
    const b = build({ nodes: [{ id: "a", type: "fails" }] });

    expect(await run(b, "a")).toMatchObject({
      status: "error",
      error: "declined",
      usage: 4,
    });
  });

  it("surfaces a parked node with its event type and a default timeout", async () => {
    const b = build({ nodes: [{ id: "a", type: "parks" }] });

    expect(await run(b, "a")).toMatchObject({
      status: "pending",
      eventType: "form-response-x",
      timeout: "30 minutes",
    });
  });

  it("falls back to the node type's declared usage", async () => {
    const b = build({ nodes: [{ id: "a", type: "costly" }] });

    expect(await run(b, "a")).toMatchObject({ usage: 9 });
  });
});

describe("skip decisions", () => {
  it("skips a node whose only upstream failed", async () => {
    const b = build({
      nodes: [
        { id: "a", type: "echo" },
        { id: "b", type: "echo", inputs: [{ name: "value", type: "json" }] },
      ],
      edges: [
        {
          source: "a",
          sourceOutput: "value",
          target: "b",
          targetInput: "value",
        },
      ],
      state: { nodeErrors: { a: "boom" } },
    });

    expect(await run(b, "b")).toMatchObject({
      status: "skipped",
      skipReason: "upstream_failure",
      blockedBy: ["a"],
    });
  });

  it("skips a node on the branch a fork did not take", async () => {
    const b = build({
      nodes: [
        { id: "a", type: "echo" },
        { id: "b", type: "echo", inputs: [{ name: "value", type: "json" }] },
      ],
      edges: [
        {
          source: "a",
          sourceOutput: "value",
          target: "b",
          targetInput: "value",
        },
      ],
      state: { executedNodes: ["a"], nodeOutputs: { a: {} } },
    });

    expect(await run(b, "b")).toMatchObject({
      status: "skipped",
      skipReason: "conditional_branch",
    });
  });

  it("does not run a node that already settled as skipped", async () => {
    const b = build({
      nodes: [{ id: "a", type: "echo" }],
      state: { skippedNodes: ["a"] },
    });

    expect(await run(b, "a")).toMatchObject({ status: "skipped" });
  });
});

describe("multi-step nodes", () => {
  it("hands out replay-stable step names", async () => {
    const b = build({ nodes: [{ id: "a", type: "stepping" }] });
    const result = await run(b, "a");

    expect(result).toMatchObject({
      status: "completed",
      outputs: { value: 2 },
    });
    expect(b.steps).toEqual(["do:a-step-0", "sleep:a-sleep-0", "do:a-step-1"]);
  });

  it("does not give step primitives to an ordinary node", async () => {
    let seen: NodeContext | undefined;
    class PeekNode extends ExecutableNode {
      static readonly nodeType = type({ id: "peek", type: "peek" });
      async execute(context: NodeContext): Promise<NodeExecution> {
        seen = context;
        return this.createSuccessResult({});
      }
    }
    class PeekRegistry extends BaseNodeRegistry {
      protected registerNodes(): void {
        this.registerImplementation(PeekNode as never);
      }
    }

    const workflow = {
      id: "wf",
      name: "wf",
      trigger: "manual",
      nodes: [
        {
          id: "a",
          name: "a",
          type: "peek",
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
        },
      ],
      edges: [],
    } as Workflow;

    const executor = new NodeExecutor(
      {},
      buildTestDependencies({ nodeRegistry: new PeekRegistry({}, false) }),
      { sleep: async () => {}, doStep: async (_n, fn) => fn() },
      false
    );

    await executor.execute(
      {
        workflow,
        workflowId: "wf",
        organizationId: "org-1",
        executionId: "exec-1",
        trigger: {},
      },
      ExecutionGraph.build(workflow),
      emptyState(),
      "a"
    );

    expect(seen?.sleep).toBeUndefined();
    expect(seen?.doStep).toBeUndefined();
  });
});

describe("node context", () => {
  it("exposes the trigger and async support flag to the node", async () => {
    let seen: NodeContext | undefined;
    class PeekNode extends ExecutableNode {
      static readonly nodeType = type({ id: "peek", type: "peek" });
      async execute(context: NodeContext): Promise<NodeExecution> {
        seen = context;
        return this.createSuccessResult({});
      }
    }
    class PeekRegistry extends BaseNodeRegistry {
      protected registerNodes(): void {
        this.registerImplementation(PeekNode as never);
      }
    }

    const workflow = {
      id: "wf",
      name: "wf",
      trigger: "manual",
      nodes: [
        {
          id: "a",
          name: "a",
          type: "peek",
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
        },
      ],
      edges: [],
    } as Workflow;

    const executor = new NodeExecutor(
      {},
      buildTestDependencies({ nodeRegistry: new PeekRegistry({}, false) }),
      { sleep: async () => {}, doStep: async (_n, fn) => fn() },
      true
    );

    await executor.execute(
      {
        workflow,
        workflowId: "wf",
        organizationId: "org-7",
        executionId: "exec-9",
        trigger: {
          telegramMessage: { chatId: 5 } as never,
          telegramBotToken: "t",
        },
      },
      ExecutionGraph.build(workflow),
      emptyState(),
      "a"
    );

    expect(seen?.organizationId).toBe("org-7");
    expect(seen?.executionId).toBe("exec-9");
    expect(seen?.asyncSupported).toBe(true);
    expect(seen?.telegramBotToken).toBe("t");
  });
});
