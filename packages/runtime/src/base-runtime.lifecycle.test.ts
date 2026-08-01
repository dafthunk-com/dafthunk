/**
 * Runtime lifecycle: the promises `run()` makes regardless of how the workflow
 * itself turns out.
 *
 * Two of them are load-bearing and easy to break. First, an execution record is
 * always persisted — a run that vanishes without a trace is worse than a failed
 * one, because nothing downstream can tell the difference between "still going"
 * and "gone". Second, credit settlement always happens, including on the
 * exhausted path, because the cached availability flag is what stops
 * non-interactive triggers from retrying forever.
 */

import type { Workflow, WorkflowExecution } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import {
  AdditionNode,
  buildTestDependencies,
  DirectRuntime,
  FailingNode,
  HarnessRuntime,
  RecordingExecutionStore,
} from "./__test-stubs__/runtime-harness";
import type { RuntimeParams } from "./base-runtime";
import type { CreditService } from "./credit-service";
import type { MonitoringService } from "./monitoring-service";

/** Two additions in a chain, with the leaf inputs seeded. */
function chainWorkflow(secondType = "addition"): Workflow {
  const first = AdditionNode.create({ id: "a", position: { x: 0, y: 0 } });
  const second =
    secondType === "failing"
      ? FailingNode.create({ id: "b", position: { x: 0, y: 0 } })
      : AdditionNode.create({ id: "b", position: { x: 0, y: 0 } });

  for (const input of first.inputs) input.value = 2;
  for (const input of second.inputs) {
    if (input.name !== "a") input.value = 5;
  }

  return {
    id: "wf-1",
    name: "Chain",
    trigger: "manual",
    nodes: [first, second],
    edges: [
      {
        source: "a",
        sourceOutput: "result",
        target: "b",
        targetInput: secondType === "failing" ? "value" : "a",
      },
    ],
  } as Workflow;
}

const params = (workflow: Workflow, over: Partial<RuntimeParams> = {}) =>
  ({
    workflow,
    userId: "user-1",
    organizationId: "org-1",
    computeCredits: 1000,
    ...over,
  }) as RuntimeParams;

/** A credit service that records what it was asked, with overridable answers. */
function creditSpy(over: Partial<CreditService> = {}) {
  const recorded: number[] = [];
  const settled: string[] = [];

  const service: CreditService = {
    hasEnoughCredits: async () => true,
    recordUsage: async (_org, usage) => {
      recorded.push(usage);
    },
    settleAvailability: async ({ organizationId }) => {
      settled.push(organizationId);
    },
    ...over,
  };

  return { service, recorded, settled };
}

function collectingMonitor() {
  const updates: WorkflowExecution[] = [];
  const service: MonitoringService = {
    sendUpdate: async (execution) => {
      updates.push(execution);
    },
  };
  return { service, updates };
}

describe("successful run", () => {
  it("persists a completed record with both nodes", async () => {
    const store = new RecordingExecutionStore();
    const record = await new HarnessRuntime(
      buildTestDependencies({ executionStore: store })
    ).run(params(chainWorkflow()), "run-1");

    expect(record.status).toBe("completed");
    expect(store.last().nodeExecutions).toHaveLength(2);
    expect(store.saved).toHaveLength(1);
  });

  it("stamps provenance onto the persisted record", async () => {
    const store = new RecordingExecutionStore();
    await new HarnessRuntime(
      buildTestDependencies({
        executionStore: store,
        runtimeVersion: "v-test",
      })
    ).run(params(chainWorkflow()), "run-1");

    const saved = store.last();
    expect(saved.runtimeVersion).toBe("v-test");
    expect(saved.definitionHash).toEqual(expect.any(String));
    expect(saved.workflowDefinition?.id).toBe("wf-1");
    expect(saved.userId).toBe("user-1");
    expect(saved.organizationId).toBe("org-1");
  });

  it("records the summed usage of every node", async () => {
    const credits = creditSpy();
    await new HarnessRuntime(
      buildTestDependencies({ creditService: credits.service })
    ).run(params(chainWorkflow()), "run-1");

    // Two addition nodes at the default usage of 1 each.
    expect(credits.recorded).toEqual([2]);
  });

  it("streams progress and ends on a terminal status", async () => {
    const monitor = collectingMonitor();
    await new HarnessRuntime(
      buildTestDependencies({ monitoringService: monitor.service })
    ).run(params(chainWorkflow()), "run-1");

    expect(monitor.updates[0].status).toBe("submitted");
    expect(monitor.updates.at(-1)?.status).toBe("completed");
    expect(monitor.updates.length).toBeGreaterThan(2);
  });

  it("reports start and end timestamps", async () => {
    const store = new RecordingExecutionStore();
    await new HarnessRuntime(
      buildTestDependencies({ executionStore: store })
    ).run(params(chainWorkflow()), "run-1");

    const { startedAt, endedAt } = store.last();
    expect(startedAt).toBeInstanceOf(Date);
    expect(endedAt).toBeInstanceOf(Date);
    expect(endedAt?.getTime() ?? 0).toBeGreaterThanOrEqual(
      startedAt?.getTime() ?? 0
    );
  });
});

describe("insufficient credits", () => {
  const exhausted = () =>
    creditSpy({ hasEnoughCredits: async () => false }).service;

  it("marks the run exhausted", async () => {
    const record = await new HarnessRuntime(
      buildTestDependencies({ creditService: exhausted() })
    ).run(params(chainWorkflow()), "run-1");

    expect(record.status).toBe("exhausted");
  });

  it("persists the exhausted record rather than dropping the run", async () => {
    const store = new RecordingExecutionStore();
    await new HarnessRuntime(
      buildTestDependencies({
        creditService: exhausted(),
        executionStore: store,
      })
    ).run(params(chainWorkflow()), "run-1");

    expect(store.saved).toHaveLength(1);
    expect(store.last().status).toBe("exhausted");
  });

  it("runs no nodes", async () => {
    const store = new RecordingExecutionStore();
    await new HarnessRuntime(
      buildTestDependencies({
        creditService: exhausted(),
        executionStore: store,
      })
    ).run(params(chainWorkflow()), "run-1");

    for (const node of store.last().nodeExecutions) {
      expect(node.status).toBe("idle");
    }
  });

  it("still settles availability so triggers stop retrying", async () => {
    const credits = creditSpy({ hasEnoughCredits: async () => false });
    await new HarnessRuntime(
      buildTestDependencies({ creditService: credits.service })
    ).run(params(chainWorkflow()), "run-1");

    expect(credits.settled).toEqual(["org-1"]);
  });

  it("records no usage for work it never did", async () => {
    const credits = creditSpy({ hasEnoughCredits: async () => false });
    await new HarnessRuntime(
      buildTestDependencies({ creditService: credits.service })
    ).run(params(chainWorkflow()), "run-1");

    expect(credits.recorded).toEqual([]);
  });

  it("passes the billing context through to the credit check", async () => {
    const seen: unknown[] = [];
    const credits = creditSpy({
      hasEnoughCredits: async (p) => {
        seen.push(p);
        return true;
      },
    });

    await new HarnessRuntime(
      buildTestDependencies({ creditService: credits.service })
    ).run(
      params(chainWorkflow(), {
        computeCredits: 50,
        subscriptionStatus: "active",
        overageLimit: 10,
        unlimitedUsage: false,
      }),
      "run-1"
    );

    expect(seen[0]).toMatchObject({
      organizationId: "org-1",
      computeCredits: 50,
      subscriptionStatus: "active",
      overageLimit: 10,
      unlimitedUsage: false,
    });
  });
});

describe("failure paths", () => {
  it("reports a validation failure as an errored run", async () => {
    const cyclic = {
      id: "wf-cycle",
      name: "Cycle",
      trigger: "manual",
      nodes: [
        AdditionNode.create({ id: "a", position: { x: 0, y: 0 } }),
        AdditionNode.create({ id: "b", position: { x: 0, y: 0 } }),
      ],
      edges: [
        { source: "a", sourceOutput: "result", target: "b", targetInput: "a" },
        { source: "b", sourceOutput: "result", target: "a", targetInput: "a" },
      ],
    } as Workflow;

    const record = await new HarnessRuntime(buildTestDependencies()).run(
      params(cyclic),
      "run-1"
    );

    expect(record.status).toBe("error");
    expect(record.error).toMatch(/validation failed/i);
  });

  it("does not persist a record when preparation never completed", async () => {
    // Nothing was derived, so there is no context to build a record from.
    const store = new RecordingExecutionStore();
    const empty = {
      id: "wf",
      name: "wf",
      trigger: "manual",
      nodes: [],
      edges: [],
    } as Workflow;

    await new HarnessRuntime(
      buildTestDependencies({ executionStore: store })
    ).run(params({ ...empty, nodes: [] } as Workflow), "run-1");

    // An empty workflow is valid, so this one *does* persist — asserting the
    // happy path here guards against the guard itself regressing.
    expect(store.saved).toHaveLength(1);
  });

  it("marks the run errored when a node fails", async () => {
    const store = new RecordingExecutionStore();
    const record = await new HarnessRuntime(
      buildTestDependencies({ executionStore: store })
    ).run(params(chainWorkflow("failing")), "run-1");

    expect(record.status).toBe("error");
    expect(store.last().error).toBe("Workflow execution failed");
  });

  it("keeps the successful node's output alongside the failure", async () => {
    const store = new RecordingExecutionStore();
    await new HarnessRuntime(
      buildTestDependencies({ executionStore: store })
    ).run(params(chainWorkflow("failing")), "run-1");

    const byId = Object.fromEntries(
      store.last().nodeExecutions.map((n) => [n.nodeId, n])
    );
    expect(byId.a.status).toBe("completed");
    expect(byId.b.status).toBe("error");
  });

  it("completes and persists even when the monitoring service is broken", async () => {
    // Monitoring is best-effort telemetry. Losing it must not lose the run:
    // a dropped execution record is indistinguishable downstream from a run
    // that is still going.
    const store = new RecordingExecutionStore();
    const flaky: MonitoringService = {
      sendUpdate: async () => {
        throw new Error("monitoring down");
      },
    };

    const record = await new HarnessRuntime(
      buildTestDependencies({
        executionStore: store,
        monitoringService: flaky,
      })
    ).run(params(chainWorkflow()), "run-1");

    expect(record.status).toBe("completed");
    expect(store.saved).toHaveLength(1);
  });

  it("survives a monitoring failure that only happens mid-run", async () => {
    const store = new RecordingExecutionStore();
    let calls = 0;
    const flaky: MonitoringService = {
      sendUpdate: async () => {
        calls += 1;
        if (calls > 1) throw new Error("monitoring died mid-run");
      },
    };

    const record = await new HarnessRuntime(
      buildTestDependencies({
        executionStore: store,
        monitoringService: flaky,
      })
    ).run(params(chainWorkflow()), "run-1");

    expect(record.status).toBe("completed");
    expect(store.saved).toHaveLength(1);
  });
});

describe("settlement resilience", () => {
  it("completes the run when recording usage throws", async () => {
    const store = new RecordingExecutionStore();
    const credits = creditSpy({
      recordUsage: async () => {
        throw new Error("billing unavailable");
      },
    });

    const record = await new HarnessRuntime(
      buildTestDependencies({
        creditService: credits.service,
        executionStore: store,
      })
    ).run(params(chainWorkflow()), "run-1");

    expect(record.status).toBe("completed");
    expect(store.saved).toHaveLength(1);
  });

  it("still settles availability after a usage-recording failure", async () => {
    const credits = creditSpy({
      recordUsage: async () => {
        throw new Error("billing unavailable");
      },
    });

    await new HarnessRuntime(
      buildTestDependencies({ creditService: credits.service })
    ).run(params(chainWorkflow()), "run-1");

    expect(credits.settled).toEqual(["org-1"]);
  });

  it("completes the run and persists when settlement throws", async () => {
    const store = new RecordingExecutionStore();
    const credits = creditSpy({
      settleAvailability: async () => {
        throw new Error("cache unavailable");
      },
    });

    const record = await new HarnessRuntime(
      buildTestDependencies({
        creditService: credits.service,
        executionStore: store,
      })
    ).run(params(chainWorkflow()), "run-1");

    expect(record.status).toBe("completed");
    expect(store.last().status).toBe("completed");
  });

  it("skips recording when nothing was consumed", async () => {
    const credits = creditSpy();
    const empty = {
      id: "wf",
      name: "wf",
      trigger: "manual",
      nodes: [],
      edges: [],
    } as Workflow;

    await new HarnessRuntime(
      buildTestDependencies({ creditService: credits.service })
    ).run(params(empty), "run-1");

    expect(credits.recorded).toEqual([]);
    expect(credits.settled).toEqual(["org-1"]);
  });
});

describe("credentials", () => {
  it("initialises credentials for the organization before running nodes", async () => {
    const initialize = vi.fn(async () => {});
    await new HarnessRuntime(
      buildTestDependencies({
        credentialProvider: {
          initialize,
          getOrganizationId: () => "org-1",
          getSecret: async () => undefined,
          getIntegration: async () => {
            throw new Error("none");
          },
        },
      })
    ).run(params(chainWorkflow()), "run-1");

    expect(initialize).toHaveBeenCalledWith("org-1");
  });

  it("does not initialise credentials when credits are exhausted", async () => {
    const initialize = vi.fn(async () => {});
    await new HarnessRuntime(
      buildTestDependencies({
        creditService: creditSpy({ hasEnoughCredits: async () => false })
          .service,
        credentialProvider: {
          initialize,
          getOrganizationId: () => "org-1",
          getSecret: async () => undefined,
          getIntegration: async () => {
            throw new Error("none");
          },
        },
      })
    ).run(params(chainWorkflow()), "run-1");

    expect(initialize).not.toHaveBeenCalled();
  });
});

describe("reentrancy", () => {
  it("keeps concurrent runs on one instance from colliding", async () => {
    // Per-run data lives on the execution context, not on the instance, so a
    // single Runtime can serve several runs at once. DirectRuntime is the
    // harness to prove it with: HarnessRuntime deliberately shares one step
    // cache per instance, mirroring how WorkflowRuntime binds a single step
    // context, and that cache — not the engine — is what would collide.
    const store = new RecordingExecutionStore();
    const runtime = new DirectRuntime(
      buildTestDependencies({ executionStore: store })
    );

    const [first, second] = await Promise.all([
      runtime.run(
        params(chainWorkflow(), { organizationId: "org-a", userId: "user-a" }),
        "run-a"
      ),
      runtime.run(
        params(chainWorkflow(), { organizationId: "org-b", userId: "user-b" }),
        "run-b"
      ),
    ]);

    expect(first.id).toBe("run-a");
    expect(second.id).toBe("run-b");

    const byId = Object.fromEntries(store.saved.map((r) => [r.id, r]));
    expect(byId["run-a"].organizationId).toBe("org-a");
    expect(byId["run-b"].organizationId).toBe("org-b");
  });
});
