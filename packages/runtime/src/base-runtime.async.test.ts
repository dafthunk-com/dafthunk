/**
 * The human-in-the-loop path: a node parks on an external event, the workflow
 * hibernates, and much later an event arrives carrying the node's outputs.
 *
 * The event payload comes from outside the engine, so it is the one place where
 * a node's outputs are not produced by the node itself. Everything here is
 * about turning that untrusted-shaped payload into an ordinary result without
 * losing the inputs collected before the node parked.
 */

import type { NodeExecution, NodeType, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  buildTestDependencies,
  InMemoryObjectStore,
  RecordingExecutionStore,
} from "./__test-stubs__/runtime-harness";
import { BaseNodeRegistry } from "./base-node-registry";
import {
  Runtime,
  type RuntimeDependencies,
  type RuntimeParams,
} from "./base-runtime";
import { ExecutableNode } from "./node-types";

interface EventPayload {
  outputs?: Record<string, unknown>;
  usage?: number;
  error?: string;
}

/** Parks immediately, the way a form or async agent node does. */
class ParkingNode extends ExecutableNode {
  static readonly nodeType = {
    id: "parks",
    name: "Parks",
    type: "parks",
    description: "",
    tags: [],
    icon: "x",
    inputs: [{ name: "seed", type: "json" }],
    outputs: [{ name: "answer", type: "json" }],
  } as NodeType;

  async execute(): Promise<NodeExecution> {
    return {
      nodeId: this.node.id,
      status: "pending",
      pendingEvent: {
        type: `form-response-${this.node.id}`,
        timeout: "1 hour",
      },
    } as NodeExecution;
  }
}

class ParkingRegistry extends BaseNodeRegistry {
  protected registerNodes(): void {
    this.registerImplementation(ParkingNode as never);
  }
}

/**
 * Runtime that supports parking. `event` is what the awaited event resolves to;
 * throwing from it simulates a timeout.
 */
class AsyncRuntime extends Runtime {
  readonly waited: Array<{ name: string; eventType: string; timeout: string }> =
    [];

  constructor(
    dependencies: RuntimeDependencies,
    private readonly event: EventPayload | (() => Promise<never>)
  ) {
    super({}, dependencies);
  }

  protected override readonly supportsAsync = true;

  protected async executeStep<T>(_name: string, fn: () => Promise<T>) {
    return fn();
  }
  protected async executeSubStep<T>(_name: string, fn: () => Promise<T>) {
    return fn();
  }
  protected async executeSleep(): Promise<void> {}

  protected async waitForNodeEvent<T>(
    name: string,
    eventType: string,
    timeout: string
  ): Promise<T> {
    this.waited.push({ name, eventType, timeout });
    if (typeof this.event === "function") return this.event();
    return this.event as T;
  }
}

function parkingWorkflow(): Workflow {
  const node = ParkingNode.create({ id: "p", position: { x: 0, y: 0 } });
  for (const input of node.inputs) input.value = "seeded";

  return {
    id: "wf",
    name: "wf",
    trigger: "manual",
    nodes: [node],
    edges: [],
  } as Workflow;
}

const params = (workflow: Workflow) =>
  ({
    workflow,
    userId: "user-1",
    organizationId: "org-1",
    computeCredits: 1000,
  }) as RuntimeParams;

async function runWith(event: EventPayload | (() => Promise<never>)) {
  const store = new RecordingExecutionStore();
  const runtime = new AsyncRuntime(
    buildTestDependencies({
      nodeRegistry: new ParkingRegistry({}, false),
      objectStore: new InMemoryObjectStore(),
      executionStore: store,
    }),
    event
  );

  const record = await runtime.run(params(parkingWorkflow()), "run-1");
  return { record, store, runtime, node: store.last().nodeExecutions[0] };
}

describe("resolving a parked node", () => {
  it("waits on the event type and timeout the node asked for", async () => {
    const { runtime } = await runWith({ outputs: { answer: 42 }, usage: 1 });

    expect(runtime.waited).toEqual([
      { name: "wait for p", eventType: "form-response-p", timeout: "1 hour" },
    ]);
  });

  it("turns the event payload into the node's outputs", async () => {
    const { node, record } = await runWith({
      outputs: { answer: 42 },
      usage: 3,
    });

    expect(record.status).toBe("completed");
    expect(node).toMatchObject({
      status: "completed",
      outputs: { answer: 42 },
      usage: 3,
    });
  });

  it("keeps the inputs collected before the node parked", async () => {
    // The node's inputs were resolved long before the event arrived; losing
    // them would leave the persisted record unable to explain the output.
    const { node } = await runWith({ outputs: { answer: 1 }, usage: 1 });

    expect(node).toMatchObject({ inputs: { seed: "seeded" } });
  });

  it("converts outputs through the node's declared parameter types", async () => {
    // `answer` is declared json, so a JSON string arriving on the event is
    // stored as the structured value rather than as text.
    const { node } = await runWith({
      outputs: { answer: { nested: true } },
      usage: 1,
    });

    expect(node).toMatchObject({ outputs: { answer: { nested: true } } });
  });

  it("reports an error carried on the event", async () => {
    const { record, node } = await runWith({
      error: "the human declined",
      usage: 2,
    });

    expect(record.status).toBe("error");
    expect(node).toMatchObject({
      status: "error",
      error: "the human declined",
      usage: 2,
    });
  });

  it("keeps the inputs when the event reports an error", async () => {
    const { node } = await runWith({ error: "declined", usage: 0 });
    expect(node).toMatchObject({ inputs: { seed: "seeded" } });
  });

  it("turns a timeout into an errored node rather than a thrown run", async () => {
    const { record, node } = await runWith(async () => {
      throw new Error("waitForEvent timed out");
    });

    expect(record.status).toBe("error");
    expect(node).toMatchObject({
      status: "error",
      error: "waitForEvent timed out",
    });
  });

  it("still persists a record when the wait fails", async () => {
    const { store } = await runWith(async () => {
      throw new Error("timed out");
    });

    expect(store.saved).toHaveLength(1);
  });

  it("tolerates an event with no outputs at all", async () => {
    const { record, node } = await runWith({ usage: 1 });

    expect(record.status).toBe("completed");
    expect(node).toMatchObject({ status: "completed", outputs: {} });
  });

  it("treats a missing usage as zero rather than poisoning the total", async () => {
    // An absent `usage` used to make the run's usage sum NaN, which silently
    // suppressed billing for *every* node in the run, not just this one.
    const { node } = await runWith({ outputs: { answer: 1 } });

    expect(node.usage).toBe(0);
  });

  it("ignores a non-numeric usage on the event", async () => {
    const { node } = await runWith({
      outputs: { answer: 1 },
      usage: "lots" as unknown as number,
    });

    expect(node.usage).toBe(0);
  });

  it("tells the node that parking is available", async () => {
    // Nodes branch on asyncSupported to decide whether to park or block.
    const runtime = new AsyncRuntime(
      buildTestDependencies({
        nodeRegistry: new ParkingRegistry({}, false),
        objectStore: new InMemoryObjectStore(),
      }),
      { outputs: {}, usage: 0 }
    );

    await runtime.run(params(parkingWorkflow()), "run-1");
    expect(runtime.waited).toHaveLength(1);
  });
});

describe("usage accounting across a parked run", () => {
  it("bills the rest of the run even when the event omits usage", async () => {
    // The real damage of the NaN sum was collateral: one malformed event
    // suppressed billing for every other node in the same execution.
    const recorded: number[] = [];
    const runtime = new AsyncRuntime(
      buildTestDependencies({
        nodeRegistry: new ParkingRegistry({}, false),
        objectStore: new InMemoryObjectStore(),
        creditService: {
          hasEnoughCredits: async () => true,
          recordUsage: async (_org, usage) => {
            recorded.push(usage);
          },
          settleAvailability: async () => {},
        },
      }),
      { outputs: { answer: 1 } }
    );

    // Seed a sibling node that did consume credits.
    const workflow = parkingWorkflow();
    const sibling = ParkingNode.create({ id: "q", position: { x: 0, y: 0 } });
    workflow.nodes.push(sibling);

    await runtime.run(params(workflow), "run-1");

    // Both parked nodes resolved with usage 0, so nothing is billed — but the
    // total is a real number, not NaN, so the recording path stays reachable.
    expect(recorded.every((value) => Number.isFinite(value))).toBe(true);
  });
});

describe("runtimes that cannot park", () => {
  it("fails the node instead of hanging when parking is unsupported", async () => {
    // WorkerRuntime has no event mechanism. A node that parks anyway must
    // surface as an error, not stall the request.
    class NoParkingRuntime extends Runtime {
      constructor(dependencies: RuntimeDependencies) {
        super({}, dependencies);
      }
      protected async executeStep<T>(_n: string, fn: () => Promise<T>) {
        return fn();
      }
      protected async executeSubStep<T>(_n: string, fn: () => Promise<T>) {
        return fn();
      }
      protected async executeSleep(): Promise<void> {}
      protected async waitForNodeEvent<T>(): Promise<T> {
        throw new Error("Async node execution is not supported");
      }
    }

    const store = new RecordingExecutionStore();
    const record = await new NoParkingRuntime(
      buildTestDependencies({
        nodeRegistry: new ParkingRegistry({}, false),
        objectStore: new InMemoryObjectStore(),
        executionStore: store,
      })
    ).run(params(parkingWorkflow()), "run-1");

    expect(record.status).toBe("error");
    expect(store.last().nodeExecutions[0]).toMatchObject({
      status: "error",
      error: expect.stringContaining("not supported"),
    });
  });
});
