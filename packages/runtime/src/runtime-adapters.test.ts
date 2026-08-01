/**
 * The two production adapters are thin, but they are where the durability
 * contract is actually honoured — everything above them assumes `executeStep`
 * really is durable and `waitForNodeEvent` really can park for a year.
 *
 * WorkflowRuntime borrows its step context per call, so the tests below also
 * pin down what happens when it is used outside one.
 */

import type { Workflow } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import {
  AdditionNode,
  buildTestDependencies,
  RecordingExecutionStore,
} from "./__test-stubs__/runtime-harness";
import type { RuntimeParams } from "./base-runtime";
import { WorkerRuntime } from "./worker-runtime";
import { WorkflowRuntime } from "./workflow-runtime";

function additionWorkflow(): Workflow {
  const node = AdditionNode.create({ id: "a", position: { x: 0, y: 0 } });
  for (const input of node.inputs) input.value = 3;

  return {
    id: "wf",
    name: "wf",
    trigger: "manual",
    nodes: [node],
    edges: [],
  } as Workflow;
}

const params = (): RuntimeParams =>
  ({
    workflow: additionWorkflow(),
    userId: "user-1",
    organizationId: "org-1",
    computeCredits: 1000,
  }) as RuntimeParams;

/** Minimal stand-in for the Cloudflare Workflows step API. */
function fakeStep() {
  const calls: Array<{ kind: string; name: string; arg?: unknown }> = [];

  const step = {
    do: vi.fn(
      async (name: string, _config: unknown, fn: () => Promise<unknown>) => {
        calls.push({ kind: "do", name });
        return fn();
      }
    ),
    sleep: vi.fn(async (name: string, duration: string) => {
      calls.push({ kind: "sleep", name, arg: duration });
    }),
    waitForEvent: vi.fn(
      async (name: string, opts: { type: string; timeout?: string }) => {
        calls.push({ kind: "waitForEvent", name, arg: opts });
        return { payload: { outputs: {}, usage: 0 } };
      }
    ),
  };

  return { step, calls };
}

describe("WorkerRuntime", () => {
  it("runs a workflow to completion", async () => {
    const store = new RecordingExecutionStore();
    const record = await new WorkerRuntime(
      {},
      buildTestDependencies({ executionStore: store })
    ).execute(params(), "run-1");

    expect(record.status).toBe("completed");
    expect(store.last().nodeExecutions[0]).toMatchObject({
      status: "completed",
      outputs: { result: 6 },
    });
  });

  it("generates an execution id when the caller omits one", async () => {
    const record = await new WorkerRuntime({}, buildTestDependencies()).execute(
      params()
    );

    expect(record.id).toEqual(expect.any(String));
    expect(record.id.length).toBeGreaterThan(0);
  });

  it("uses the execution id it was given", async () => {
    const record = await new WorkerRuntime({}, buildTestDependencies()).execute(
      params(),
      "explicit-id"
    );

    expect(record.id).toBe("explicit-id");
  });

  it("declines to park, so nodes fall back to blocking", async () => {
    // Nodes read asyncSupported to decide; the flag and the throw must agree.
    class Probe extends WorkerRuntime {
      readonly async = this.supportsAsync;
      wait() {
        return this.waitForNodeEvent();
      }
    }
    const probe = new Probe({}, buildTestDependencies());

    expect(probe.async).toBe(false);
    await expect(probe.wait()).rejects.toThrow(/not supported/i);
  });

  it("serves concurrent runs from one instance", async () => {
    const store = new RecordingExecutionStore();
    const runtime = new WorkerRuntime(
      {},
      buildTestDependencies({ executionStore: store })
    );

    const [a, b] = await Promise.all([
      runtime.execute(params(), "run-a"),
      runtime.execute(params(), "run-b"),
    ]);

    expect([a.id, b.id].sort()).toEqual(["run-a", "run-b"]);
    expect(store.saved).toHaveLength(2);
  });
});

describe("WorkflowRuntime", () => {
  it("routes every lifecycle phase through a durable step", async () => {
    const { step, calls } = fakeStep();
    await new WorkflowRuntime({}, buildTestDependencies()).executeWithStep(
      params(),
      "run-1",
      step as never
    );

    const names = calls.filter((c) => c.kind === "do").map((c) => c.name);
    expect(names).toContain("initialise workflow");
    expect(names).toContain("preload organization resources");
    expect(names).toContain("run node a");
    expect(names).toContain("persist final execution record");
  });

  it("passes a retry policy to every step", async () => {
    const { step } = fakeStep();
    await new WorkflowRuntime({}, buildTestDependencies()).executeWithStep(
      params(),
      "run-1",
      step as never
    );

    const [, config] = step.do.mock.calls[0];
    expect(config).toMatchObject({
      retries: { limit: expect.any(Number) },
      timeout: expect.any(String),
    });
  });

  it("advertises that it can park nodes", async () => {
    class Probe extends WorkflowRuntime {
      readonly async = this.supportsAsync;
    }
    expect(new Probe({}, buildTestDependencies()).async).toBe(true);
  });

  it("releases the step context after the run", async () => {
    const { step } = fakeStep();
    const runtime = new WorkflowRuntime({}, buildTestDependencies());
    await runtime.executeWithStep(params(), "run-1", step as never);

    // Borrowed per call, so using the runtime outside executeWithStep must
    // fail loudly rather than reuse a stale step from a previous run.
    class Probe extends WorkflowRuntime {
      step() {
        return this.executeStep("orphan", async () => 1);
      }
    }
    const probe = new Probe({}, buildTestDependencies());
    await expect(probe.step()).rejects.toThrow(/without workflow step context/);
  });

  it("rejects sleeping and waiting outside a step context", async () => {
    class Probe extends WorkflowRuntime {
      sleep() {
        return this.executeSleep("s", 1000);
      }
      sub() {
        return this.executeSubStep("s", async () => 1);
      }
      wait() {
        return this.waitForNodeEvent("w", "evt", "1 hour");
      }
    }
    const probe = new Probe({}, buildTestDependencies());

    await expect(probe.sleep()).rejects.toThrow(
      /without workflow step context/
    );
    await expect(probe.sub()).rejects.toThrow(/without workflow step context/);
    await expect(probe.wait()).rejects.toThrow(/without workflow step context/);
  });

  it("converts a millisecond sleep into whole seconds", async () => {
    const { step, calls } = fakeStep();

    class Probe extends WorkflowRuntime {
      async withStep(fn: () => Promise<unknown>, s: unknown) {
        // Reuse the public entry point to bind the step, then sleep inside it.
        (this as unknown as { currentStep: unknown }).currentStep = s;
        try {
          return await fn();
        } finally {
          (this as unknown as { currentStep: unknown }).currentStep = undefined;
        }
      }
      sleep(ms: number) {
        return this.executeSleep("nap", ms);
      }
    }

    const probe = new Probe({}, buildTestDependencies());
    await probe.withStep(() => probe.sleep(2500), step);
    await probe.withStep(() => probe.sleep(10), step);

    const sleeps = calls.filter((c) => c.kind === "sleep");
    // Rounded up, and never below one second — Workflows rejects zero.
    expect(sleeps[0].arg).toBe("3 seconds");
    expect(sleeps[1].arg).toBe("1 seconds");
  });

  it("forwards the event type and timeout to waitForEvent", async () => {
    const { step, calls } = fakeStep();

    class Probe extends WorkflowRuntime {
      async withStep<T>(fn: () => Promise<T>, s: unknown): Promise<T> {
        (this as unknown as { currentStep: unknown }).currentStep = s;
        try {
          return await fn();
        } finally {
          (this as unknown as { currentStep: unknown }).currentStep = undefined;
        }
      }
      wait() {
        return this.waitForNodeEvent(
          "wait for n",
          "form-response-n",
          "2 hours"
        );
      }
    }

    const probe = new Probe({}, buildTestDependencies());
    const payload = await probe.withStep(() => probe.wait(), step);

    expect(calls.find((c) => c.kind === "waitForEvent")).toMatchObject({
      name: "wait for n",
      arg: { type: "form-response-n", timeout: "2 hours" },
    });
    expect(payload).toEqual({ outputs: {}, usage: 0 });
  });

  it("produces the same result as the worker runtime for the same workflow", async () => {
    // The adapters differ in durability, not in outcome.
    const { step } = fakeStep();
    const workflowStore = new RecordingExecutionStore();
    const workerStore = new RecordingExecutionStore();

    await new WorkflowRuntime(
      {},
      buildTestDependencies({ executionStore: workflowStore })
    ).executeWithStep(params(), "run-1", step as never);

    await new WorkerRuntime(
      {},
      buildTestDependencies({ executionStore: workerStore })
    ).execute(params(), "run-1");

    expect(workflowStore.last().status).toBe(workerStore.last().status);
    expect(workflowStore.last().nodeExecutions).toEqual(
      workerStore.last().nodeExecutions
    );
  });
});
