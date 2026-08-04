/**
 * Per-run input overrides — the channel that lets a saved set of inputs drive a
 * run without being written into the graph.
 *
 * The reason it is a channel rather than a graph rewrite is pinned by the last
 * test here: the definition hash covers node input values, so overlaying by
 * rewriting them would make every set of inputs look like a different workflow
 * version and fragment the execution history.
 */

import type { Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  AdditionNode,
  buildTestDependencies,
  DirectRuntime,
  RecordingExecutionStore,
} from "./__test-stubs__/runtime-harness";
import type { RuntimeParams } from "./base-runtime";
import { computeDefinitionHash } from "./definition-hash";

/** One addition with both inputs seeded on the node. */
function singleNode(): Workflow {
  const node = AdditionNode.create({ id: "sum", position: { x: 0, y: 0 } });
  for (const input of node.inputs) input.value = 1;

  return {
    id: "wf-1",
    name: "Sum",
    trigger: "manual",
    nodes: [node],
    edges: [],
  };
}

/** `a` is fed by an upstream node; `b` is a literal. */
function chained(): Workflow {
  const upstream = AdditionNode.create({ id: "up", position: { x: 0, y: 0 } });
  for (const input of upstream.inputs) input.value = 10;

  const downstream = AdditionNode.create({
    id: "sum",
    position: { x: 0, y: 0 },
  });
  for (const input of downstream.inputs) input.value = 1;

  return {
    id: "wf-2",
    name: "Chain",
    trigger: "manual",
    nodes: [upstream, downstream],
    edges: [
      { source: "up", sourceOutput: "result", target: "sum", targetInput: "a" },
    ],
  };
}

async function run(
  workflow: Workflow,
  inputOverrides?: RuntimeParams["inputOverrides"]
) {
  const store = new RecordingExecutionStore();
  const runtime = new DirectRuntime(
    buildTestDependencies({ executionStore: store })
  );

  await runtime.run({
    workflow,
    userId: "user-1",
    organizationId: "org-1",
    computeCredits: 1000,
    unlimitedUsage: true,
    inputOverrides,
  } as RuntimeParams);

  return store.last();
}

function nodeResult(record: Awaited<ReturnType<typeof run>>, nodeId: string) {
  const execution = record.nodeExecutions.find((n) => n.nodeId === nodeId);
  if (!execution) throw new Error(`No execution for ${nodeId}`);
  return execution;
}

describe("input overrides", () => {
  it("replaces the literal configured on the node", async () => {
    const record = await run(singleNode(), { sum: { a: 5, b: 7 } });

    expect(nodeResult(record, "sum").outputs?.result).toBe(12);
  });

  it("leaves inputs it does not mention alone", async () => {
    // Only `a` is overridden; `b` keeps its literal of 1.
    const record = await run(singleNode(), { sum: { a: 5 } });

    expect(nodeResult(record, "sum").outputs?.result).toBe(6);
  });

  it("does not apply to nodes it does not name", async () => {
    const record = await run(singleNode(), { somewhereElse: { a: 99 } });

    expect(nodeResult(record, "sum").outputs?.result).toBe(2);
  });

  it("ignores inputs the node does not declare", async () => {
    // A stale override must not be able to invent a parameter.
    const record = await run(singleNode(), { sum: { nonexistent: 99 } });

    expect(nodeResult(record, "sum").outputs?.result).toBe(2);
  });

  it("loses to an inbound edge", async () => {
    // `a` is connected, so the upstream value (20) wins over the override.
    // `b` is unconnected, so its override applies.
    const record = await run(chained(), { sum: { a: 999, b: 5 } });

    expect(nodeResult(record, "sum").outputs?.result).toBe(25);
  });

  it("records the values the run actually used", async () => {
    const record = await run(singleNode(), { sum: { a: 5, b: 7 } });

    // The persisted inputs are what the UI shows, so an overridden run has to
    // report the overridden values rather than the graph's literals.
    expect(nodeResult(record, "sum").inputs).toMatchObject({ a: 5, b: 7 });
  });

  it("runs unchanged when no overrides are supplied", async () => {
    const record = await run(singleNode());

    expect(nodeResult(record, "sum").outputs?.result).toBe(2);
  });

  it("leaves the definition hash untouched", async () => {
    // The whole reason overrides are a separate channel: two runs with different
    // inputs must still group as one workflow version.
    const workflow = singleNode();
    const before = await computeDefinitionHash(workflow);

    await run(workflow, { sum: { a: 5, b: 7 } });

    expect(await computeDefinitionHash(workflow)).toBe(before);

    // And for contrast, the graph rewrite this avoids does change it.
    const rewritten = singleNode();
    for (const input of rewritten.nodes[0].inputs) input.value = 5;
    expect(await computeDefinitionHash(rewritten)).not.toBe(before);
  });
});
