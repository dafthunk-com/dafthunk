/**
 * Durable-step replay semantics.
 *
 * Cloudflare Workflows re-executes `run()` from the top when an instance
 * resumes (after hibernating on a sleep or a waitForEvent), returning cached
 * results for steps that already completed instead of running their bodies.
 * Anything a node execution contributes to the final record therefore has to
 * travel on its NodeExecutionResult; a write into ExecutionState from inside a
 * step body is silently dropped on the second pass.
 */

import type { Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  AdditionNode,
  buildTestDependencies,
  HarnessRuntime,
  RecordingExecutionStore,
  StepCache,
} from "./__test-stubs__/runtime-harness";
import type { RuntimeParams } from "./base-runtime";

function additionWorkflow(): Workflow {
  return {
    id: "wf-replay",
    name: "Replay Workflow",
    trigger: "manual",
    nodes: [
      AdditionNode.create({ id: "a", position: { x: 0, y: 0 } }),
      AdditionNode.create({ id: "b", position: { x: 0, y: 0 } }),
    ],
    edges: [
      { source: "a", sourceOutput: "result", target: "b", targetInput: "a" },
    ],
  } as Workflow;
}

function params(workflow: Workflow): RuntimeParams {
  // Seed the leaf inputs that aren't supplied by an upstream edge.
  for (const node of workflow.nodes) {
    for (const input of node.inputs) {
      if (node.id === "a") input.value = 2;
      if (node.id === "b" && input.name === "b") input.value = 5;
    }
  }
  return {
    workflow,
    userId: "test-user",
    organizationId: "test-org",
    computeCredits: 1000,
  };
}

function inputsById(record: { nodeExecutions: Array<Record<string, any>> }) {
  return Object.fromEntries(
    record.nodeExecutions.map((ne) => [ne.nodeId, ne.inputs])
  );
}

/**
 * Runs a workflow to completion, then resumes it from a cache holding only the
 * node-execution steps — the state an instance is in when it hibernates after
 * running its nodes but before persisting the final record.
 */
async function runThenResume() {
  const workflow = additionWorkflow();
  const cache = new StepCache();

  const firstStore = new RecordingExecutionStore();
  await new HarnessRuntime(
    buildTestDependencies({ executionStore: firstStore }),
    cache
  ).run(params(workflow), "run-1");

  cache.forget((name) => !name.startsWith("run node "));

  const resumedStore = new RecordingExecutionStore();
  await new HarnessRuntime(
    buildTestDependencies({ executionStore: resumedStore }),
    cache
  ).run(params(workflow), "run-1");

  return { original: firstStore.last(), resumed: resumedStore.last() };
}

describe("durable-step replay", () => {
  it("preserves node inputs when node steps are served from cache", async () => {
    const { original, resumed } = await runThenResume();

    expect(resumed.status).toBe(original.status);
    expect(inputsById(resumed)).toEqual(inputsById(original));

    // Guard the specific regression: inputs must be populated, not just equal.
    expect(inputsById(resumed).a).toEqual({ a: 2, b: 2 });
    expect(inputsById(resumed).b).toEqual({ a: 4, b: 5 });
  });

  it("preserves node outputs across replay", async () => {
    const { original, resumed } = await runThenResume();

    const outputs = (record: { nodeExecutions: Array<Record<string, any>> }) =>
      Object.fromEntries(
        record.nodeExecutions.map((ne) => [ne.nodeId, ne.outputs])
      );

    expect(outputs(resumed)).toEqual(outputs(original));
    expect(outputs(resumed).b).toEqual({ result: 9 });
  });
});
