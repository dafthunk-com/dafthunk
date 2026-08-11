/**
 * In-package test harness for exercising Runtime without Cloudflare bindings.
 *
 * The interesting capability here is {@link StepCache}: it lets a test run the
 * same workflow twice against one cache, which is exactly the shape of a
 * Cloudflare Workflows replay (the top-level `run()` re-executes, but completed
 * `step.do()` calls return their cached result without running the body).
 * Anything a node execution produces must survive that round trip.
 */

import type {
  NodeExecution,
  NodeType,
  ObjectReference,
  Workflow,
} from "@dafthunk/types";

import { BaseNodeRegistry } from "../base-node-registry";
import { Runtime, type RuntimeDependencies } from "../base-runtime";
import type { CredentialService } from "../credential-service";
import type { CreditService } from "../credit-service";
import type { ExecutionStore } from "../execution-store";
import type { ExecutionState } from "../execution-types";
import type { MonitoringService } from "../monitoring-service";
import type { NodeContext } from "../node-types";
import { ExecutableNode } from "../node-types";
import type { ObjectMetadata, ObjectStore } from "../object-store";

/**
 * Builds a workflow from a compact edge notation: `"a:out -> b:in"`, or just
 * `"a -> b"` when the port names don't matter to the test. Nodes referenced by
 * any edge are created automatically; `extraNodes` adds isolated ones.
 */
export function workflowOf(
  edgeSpecs: string[],
  extraNodes: string[] = []
): Workflow {
  const edges = edgeSpecs.map((spec) => {
    const [from, to] = spec.split("->").map((s) => s.trim());
    const [source, sourceOutput = "out"] = from.split(":");
    const [target, targetInput = "in"] = to.split(":");
    return { source, sourceOutput, target, targetInput };
  });

  const ids = [
    ...new Set([...extraNodes, ...edges.flatMap((e) => [e.source, e.target])]),
  ];

  return {
    id: "wf",
    name: "wf",
    trigger: "manual",
    nodes: ids.map((id) => ({
      id,
      name: id,
      type: "test",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    })),
    edges,
  } as Workflow;
}

/** A blank ExecutionState, with optional pre-seeded fields. */
export function emptyState(over: Partial<ExecutionState> = {}): ExecutionState {
  return {
    nodeInputs: {},
    nodeOutputs: {},
    executedNodes: [],
    skippedNodes: [],
    nodeErrors: {},
    nodeUsage: {},
    ...over,
  };
}

/** Adds two numbers. The minimum viable node for runtime-level tests. */
export class AdditionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "addition",
    name: "Addition",
    type: "addition",
    description: "Adds two numbers (test node)",
    tags: ["Math", "Test"],
    icon: "plus",
    inputs: [
      { name: "a", type: "number", required: true },
      { name: "b", type: "number", required: true },
    ],
    outputs: [{ name: "result", type: "number" }],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const a = Number(context.inputs.a);
    const b = Number(context.inputs.b);
    if (Number.isNaN(a) || Number.isNaN(b)) {
      return this.createErrorResult("Both inputs must be numbers");
    }
    return this.createSuccessResult({ result: a + b });
  }
}

/** Always fails. Used to exercise error and skip propagation. */
export class FailingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "failing",
    name: "Failing",
    type: "failing",
    description: "Always fails (test node)",
    tags: ["Test"],
    icon: "x",
    inputs: [{ name: "value", type: "number" }],
    outputs: [{ name: "result", type: "number" }],
  };

  async execute(): Promise<NodeExecution> {
    return this.createErrorResult("Intentional failure");
  }
}

export class TestNodeRegistry extends BaseNodeRegistry {
  protected registerNodes(): void {
    this.registerImplementation(AdditionNode);
    this.registerImplementation(FailingNode);
  }
}

/**
 * Records step results by name and replays them on subsequent lookups,
 * mirroring Cloudflare Workflows durable-step semantics. Values round-trip
 * through JSON so tests catch anything that isn't actually serializable.
 */
export class StepCache {
  private readonly entries = new Map<string, string>();

  async run<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(name);
    if (cached !== undefined) {
      return JSON.parse(cached) as T;
    }
    const result = await fn();
    this.entries.set(name, JSON.stringify(result ?? null));
    return result;
  }

  /** Step names recorded so far, in insertion order. */
  names(): string[] {
    return [...this.entries.keys()];
  }

  /**
   * Drops cached steps whose name matches, modelling an instance that
   * hibernated before those steps ran. A real replay is always partial: the
   * steps that already completed are served from cache, the rest execute.
   */
  forget(matches: (name: string) => boolean): void {
    for (const name of this.entries.keys()) {
      if (matches(name)) this.entries.delete(name);
    }
  }
}

export class HarnessRuntime extends Runtime {
  constructor(
    dependencies: RuntimeDependencies,
    private readonly cache: StepCache = new StepCache()
  ) {
    super({}, dependencies);
  }

  protected async executeStep<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.cache.run(name, fn);
  }

  protected async executeSubStep<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.cache.run(name, fn);
  }

  protected async executeSleep(): Promise<void> {}

  protected async waitForNodeEvent<T>(): Promise<T> {
    throw new Error("waitForNodeEvent is not supported in HarnessRuntime");
  }
}

/**
 * Runs steps straight through with no caching, the way WorkerRuntime does.
 *
 * Because it holds no step context on the instance, one DirectRuntime can serve
 * concurrent runs — which is what makes it the right harness for testing that
 * Runtime itself keeps no per-run state.
 */
export class DirectRuntime extends Runtime {
  constructor(dependencies: RuntimeDependencies) {
    super({}, dependencies);
  }

  protected async executeStep<T>(_name: string, fn: () => Promise<T>) {
    return fn();
  }

  protected async executeSubStep<T>(_name: string, fn: () => Promise<T>) {
    return fn();
  }

  protected async executeSleep(): Promise<void> {}

  protected async waitForNodeEvent<T>(): Promise<T> {
    throw new Error("waitForNodeEvent is not supported in DirectRuntime");
  }
}

/** Captures every record the runtime persists, newest last. */
export class RecordingExecutionStore implements ExecutionStore {
  readonly saved: Parameters<ExecutionStore["save"]>[0][] = [];

  async save(record: Parameters<ExecutionStore["save"]>[0]) {
    this.saved.push(record);
    return {
      id: record.id,
      workflowId: record.workflowId,
      status: record.status,
      nodeExecutions: record.nodeExecutions,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      // Mirrors the production store: the flag round-trips onto the
      // execution the caller gets back.
      ...(record.rehearsal ? { rehearsal: true as const } : {}),
    } as Awaited<ReturnType<ExecutionStore["save"]>>;
  }

  async get() {
    return undefined;
  }
  async getWithData() {
    return undefined;
  }
  async list() {
    return [];
  }

  /** The most recently persisted record. Throws if nothing was saved. */
  last() {
    const record = this.saved.at(-1);
    if (!record) throw new Error("No execution record was persisted");
    return record;
  }
}

/**
 * Object store backed by a Map. Enough to exercise the blob round trip that
 * parameter conversion depends on, without touching R2.
 */
export class InMemoryObjectStore implements ObjectStore {
  private readonly objects = new Map<
    string,
    { data: Uint8Array; mimeType: string; filename?: string }
  >();
  private nextId = 0;

  /** Number of objects written so far, for asserting write behaviour. */
  get size(): number {
    return this.objects.size;
  }

  async writeObject(
    data: Uint8Array,
    mimeType: string,
    _organizationId: string,
    _executionId?: string,
    filename?: string
  ): Promise<ObjectReference> {
    const id = `obj-${this.nextId++}`;
    this.objects.set(id, { data, mimeType, filename });
    return filename ? { id, mimeType, filename } : { id, mimeType };
  }

  async writeObjectWithId(
    id: string,
    data: Uint8Array,
    mimeType: string,
    _organizationId: string,
    _executionId?: string,
    filename?: string
  ): Promise<ObjectReference> {
    this.objects.set(id, { data, mimeType, filename });
    return filename ? { id, mimeType, filename } : { id, mimeType };
  }

  async readObject(reference: ObjectReference) {
    const stored = this.objects.get(reference.id);
    return stored ? { data: stored.data, metadata: undefined } : null;
  }

  async deleteObject(reference: ObjectReference): Promise<void> {
    this.objects.delete(reference.id);
  }

  async getPresignedUrl(reference: ObjectReference): Promise<string> {
    return `memory://${reference.id}`;
  }

  async writeAndPresign(
    data: Uint8Array,
    mimeType: string,
    organizationId: string
  ): Promise<string> {
    const ref = await this.writeObject(data, mimeType, organizationId);
    return this.getPresignedUrl(ref);
  }

  async presignUpload(mimeType: string, organizationId: string) {
    const reference = await this.writeObject(
      new Uint8Array(),
      mimeType,
      organizationId
    );
    return { uploadUrl: `memory://upload/${reference.id}`, reference };
  }

  async listObjects(): Promise<ObjectMetadata[]> {
    return [];
  }
}

const unusedObjectStore: ObjectStore = {
  async writeObject() {
    throw new Error("not implemented");
  },
  async writeObjectWithId() {
    throw new Error("not implemented");
  },
  async readObject() {
    return null;
  },
  async deleteObject() {},
  async getPresignedUrl() {
    return "";
  },
  async writeAndPresign() {
    return "";
  },
  async presignUpload(): Promise<{
    uploadUrl: string;
    reference: ObjectReference;
  }> {
    throw new Error("not implemented");
  },
  async listObjects(): Promise<ObjectMetadata[]> {
    return [];
  },
};

const permissiveCredits: CreditService = {
  async hasEnoughCredits() {
    return true;
  },
  async recordUsage() {},
  async settleAvailability() {},
};

const emptyCredentials: CredentialService = {
  async initialize() {},
  getOrganizationId() {
    return "test-org";
  },
  async getSecret() {
    return undefined;
  },
  async getIntegration() {
    throw new Error("No integrations in the test harness");
  },
};

const silentMonitoring: MonitoringService = {
  async sendUpdate() {},
};

/**
 * Builds a dependency bag suitable for runtime-level tests. Pass overrides for
 * whichever collaborator the test actually cares about.
 */
export function buildTestDependencies(
  overrides: Partial<RuntimeDependencies> = {}
): RuntimeDependencies {
  return {
    nodeRegistry: new TestNodeRegistry({}, false),
    credentialProvider: emptyCredentials,
    executionStore: new RecordingExecutionStore(),
    monitoringService: silentMonitoring,
    creditService: permissiveCredits,
    objectStore: unusedObjectStore,
    ...overrides,
  };
}
