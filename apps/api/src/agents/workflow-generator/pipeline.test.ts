import type { InputOverrides } from "@dafthunk/runtime";
import type {
  GeneratorServerMessage,
  Workflow,
  WorkflowExample,
  WorkflowExecution,
} from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { workflowToDraft } from "./adopt";
import { selectCandidates } from "./catalog-selection";
import { withheldProviders, withheldResources } from "./eligibility";
import { FIXTURE_NODE_TYPES } from "./fixtures";
import type { GenerateResult, PipelineDependencies } from "./pipeline";
import {
  formatRunFailures,
  isRunImprovement,
  runGenerationPipeline,
} from "./pipeline";
import { buildUserPrompt } from "./prompts";
import { firstFailure } from "./trace";

/** A draft whose only fault is a json -> string edge, the archetypal mistake. */
const BROKEN_DRAFT = {
  title: "Echo",
  description: "Echoes a value",
  trigger: "manual",
  steps: ["Read a JSON value", "Show it"],
  nodes: [
    { id: "src", type: "json-input", inputs: { value: { a: 1 } } },
    { id: "sink", type: "output-text" },
  ],
  edges: [
    {
      source: "src",
      sourceOutput: "value",
      target: "sink",
      targetInput: "value",
    },
  ],
};

const FIXED_DRAFT = {
  ...BROKEN_DRAFT,
  nodes: [...BROKEN_DRAFT.nodes, { id: "conv", type: "to-string" }],
  edges: [
    {
      source: "src",
      sourceOutput: "value",
      target: "conv",
      targetInput: "value",
    },
    {
      source: "conv",
      sourceOutput: "result",
      target: "sink",
      targetInput: "value",
    },
  ],
};

/** The same graph, with the test inputs the prompt asks for. */
const DRAFT_WITH_EXAMPLES = {
  ...FIXED_DRAFT,
  examples: [
    { name: "Small object", nodeValues: { src: { value: { a: 1 } } } },
    { name: "Empty object", nodeValues: { src: { value: {} } } },
  ],
};

function llmResult(payload: unknown): GenerateResult {
  return {
    content: JSON.stringify(payload),
    inputTokens: 100,
    outputTokens: 50,
  };
}

function execution(status: WorkflowExecution["status"]): WorkflowExecution {
  return {
    id: "exec-1",
    workflowId: "wf-1",
    status,
    nodeExecutions: [],
  } as WorkflowExecution;
}

/**
 * `statuses` drives the run mock, one entry per execution, defaulting to
 * "completed" once exhausted — which is how a failing first run and a healthy
 * second one are expressed.
 */
function harness(
  responses: GenerateResult[],
  overrides: Partial<PipelineDependencies> = {},
  statuses: WorkflowExecution["status"][] = []
) {
  const frames: GeneratorServerMessage[] = [];
  const saved: Workflow[] = [];
  const savedExamples: WorkflowExample[][] = [];
  const savedUnder: (string | undefined)[] = [];
  const ranWith: Array<InputOverrides | undefined> = [];

  const callLLM = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("callLLM called more times than expected");
    return next;
  });
  const save = vi.fn(
    async (
      workflow: Workflow,
      examples: WorkflowExample[],
      workflowId?: string
    ) => {
      saved.push(workflow);
      savedExamples.push(examples);
      savedUnder.push(workflowId);
      return "wf-1";
    }
  );
  const run = vi.fn(
    async (
      _workflow: Workflow,
      _workflowId: string,
      _parameters: unknown,
      inputOverrides?: InputOverrides
    ) => {
      ranWith.push(inputOverrides);
      return execution(statuses.shift() ?? "completed");
    }
  );

  const deps: PipelineDependencies = {
    prompt: "echo a json value as text",
    nodeTypes: FIXTURE_NODE_TYPES,
    connectedProviders: new Set(),
    callLLM,
    emit: (frame) => frames.push(frame),
    save,
    run,
    ...overrides,
  };

  return {
    deps,
    frames,
    saved,
    savedExamples,
    savedUnder,
    ranWith,
    callLLM,
    save,
    run,
  };
}

const phases = (frames: GeneratorServerMessage[]) =>
  frames.filter((f) => f.type === "phase").map((f) => f.phase);

describe("runGenerationPipeline", () => {
  it("repairs a json -> string mismatch and then saves and runs", async () => {
    const { deps, frames, saved, callLLM, save, run } = harness([
      llmResult(BROKEN_DRAFT),
      llmResult(FIXED_DRAFT),
    ]);

    const result = await runGenerationPipeline(deps);

    expect(callLLM).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe("ok");
    expect(result.workflowId).toBe("wf-1");

    // The first pass must have reported the mismatch, the second must be clean.
    const validations = frames.filter((f) => f.type === "validation");
    expect(validations[0].issues.some((i) => i.code === "TYPE_MISMATCH")).toBe(
      true
    );
    expect(validations[1].issues.filter((i) => i.severity === "fatal")).toEqual(
      []
    );

    expect(phases(frames)).toEqual([
      "selecting",
      "planning",
      "generating",
      "validating",
      "repairing",
      "saving",
      "running",
      "complete",
    ]);

    expect(save).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);

    // Whatever we saved must itself be valid.
    expect(saved[0].nodes.some((n) => n.type === "to-string")).toBe(true);

    const done = frames.find((f) => f.type === "done");
    expect(done).toMatchObject({ outcome: "ok", workflowId: "wf-1" });

    // Tokens are accumulated across both calls, for cost measurement.
    expect(result.inputTokens).toBe(200);
    expect(result.outputTokens).toBe(100);
  });

  it("never saves a graph it could not repair", async () => {
    const { deps, frames, save, run, callLLM } = harness([
      llmResult(BROKEN_DRAFT),
      llmResult(BROKEN_DRAFT),
      llmResult(BROKEN_DRAFT),
    ]);

    const result = await runGenerationPipeline(deps);

    expect(result.outcome).toBe("failed");
    expect(save).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    // Initial attempt plus MAX_REPAIR_ATTEMPTS.
    expect(callLLM).toHaveBeenCalledTimes(3);

    expect(frames.find((f) => f.type === "error")).toMatchObject({
      code: "UNREPAIRABLE",
      recoverable: true,
    });
    // The last attempt is still shown so the user has something to work from.
    expect(frames.filter((f) => f.type === "graph")).toHaveLength(3);
  });

  it("skips the repair loop entirely when the first draft is valid", async () => {
    const { deps, callLLM, frames } = harness([llmResult(FIXED_DRAFT)]);

    const result = await runGenerationPipeline(deps);

    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe("ok");
    expect(phases(frames)).not.toContain("repairing");
  });

  it("saves the model's examples and runs the default one", async () => {
    const { deps, savedExamples, ranWith } = harness([
      llmResult(DRAFT_WITH_EXAMPLES),
    ]);

    await runGenerationPipeline(deps);

    expect(savedExamples[0].map((example) => example.name)).toEqual([
      "Small object",
      "Empty object",
    ]);
    // The run goes through the same override channel the Run button uses, so
    // the default example's values are what executed.
    expect(ranWith[0]).toEqual({ src: { value: { a: 1 } } });
  });

  it("repairs a run that failed, then re-saves under the same workflow", async () => {
    const { deps, frames, savedUnder, callLLM, save, run } = harness(
      [llmResult(FIXED_DRAFT), llmResult(FIXED_DRAFT)],
      {},
      ["error"]
    );

    const result = await runGenerationPipeline(deps);

    expect(callLLM).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe("ok");

    // One workflow, updated — not a second one alongside the broken first.
    expect(save).toHaveBeenCalledTimes(2);
    expect(savedUnder).toEqual([undefined, "wf-1"]);

    // The failed run is still reported; the UI keeps the last one.
    expect(frames.filter((f) => f.type === "run_result")).toHaveLength(2);
    expect(
      phases(frames).filter((phase) => phase === "repairing")
    ).toHaveLength(1);
  });

  it("reports a partial outcome when the repaired run fails too", async () => {
    const { deps, frames, run } = harness(
      [llmResult(FIXED_DRAFT), llmResult(FIXED_DRAFT)],
      {},
      ["error", "error"]
    );

    const result = await runGenerationPipeline(deps);

    // One round only: the budget is spent, so it stops rather than looping.
    expect(run).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe("partial");
    expect(frames.find((f) => f.type === "done")).toMatchObject({
      outcome: "partial",
    });
  });

  it("keeps the working workflow when the run fix does not validate", async () => {
    const { deps, frames, save, saved } = harness(
      [
        llmResult(FIXED_DRAFT),
        llmResult(BROKEN_DRAFT),
        llmResult(BROKEN_DRAFT),
        llmResult(BROKEN_DRAFT),
      ],
      {},
      ["error"]
    );

    const result = await runGenerationPipeline(deps);

    // Nothing was overwritten with a graph the editor could not open.
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.workflow).toBe(saved[0]);
    expect(result.outcome).toBe("partial");
    expect(
      frames.some(
        (f) =>
          f.type === "log" && f.level === "warn" && f.message.includes("kept")
      )
    ).toBe(true);
  });

  it("surfaces a malformed model response instead of throwing", async () => {
    const { deps, frames } = harness([
      { content: "I cannot help with that.", inputTokens: 5, outputTokens: 5 },
    ]);

    const result = await runGenerationPipeline(deps);

    expect(result.outcome).toBe("failed");
    expect(frames.find((f) => f.type === "error")).toMatchObject({
      code: "LLM_FAILED",
    });
  });

  /**
   * The failure this class of bug produces: a workflow that exists, runs, and
   * is reported to the user as never having been built.
   *
   * Everything after the save can still throw — the gateway is unreachable for
   * a repair round, the second trial run fails outright, the re-save is
   * rejected. The workflow is in their workspace either way, and a `failed`
   * with no id leaves it there with nothing linking back to it.
   */
  it("keeps a workflow that was already saved when a later step throws", async () => {
    // One draft, one failing run. The run-repair round then asks for a second
    // response the harness does not have, which throws after the save.
    const { deps, frames, save } = harness([llmResult(FIXED_DRAFT)], {}, [
      "error",
    ]);

    const result = await runGenerationPipeline(deps);

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe("partial");
    expect(result.workflowId).toBe("wf-1");
    // The execution happened and is worth reporting even though the repair
    // round never completed.
    expect(result.executionId).toBe("exec-1");
    expect(result.workflow).toBeDefined();

    // The client has to settle on something, and a `done` carrying the id is
    // what puts the workflow in front of the user.
    expect(frames.find((f) => f.type === "done")).toMatchObject({
      outcome: "partial",
      workflowId: "wf-1",
    });
    expect(frames.find((f) => f.type === "error")).toMatchObject({
      recoverable: true,
    });
  });

  it("discards an unreadable repair rather than failing the generation", async () => {
    const { deps, frames, callLLM } = harness([
      llmResult(BROKEN_DRAFT),
      { content: "Sorry, I got cut off", inputTokens: 5, outputTokens: 5 },
      llmResult(FIXED_DRAFT),
    ]);

    const result = await runGenerationPipeline(deps);

    // Stops on the unreadable round instead of spending the rest of the budget
    // re-asking a question the model has already failed to answer.
    expect(callLLM).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe("failed");

    // Reported as a graph that could not be repaired — which is what happened —
    // rather than as an internal failure. The closest attempt is still on screen.
    expect(frames.find((f) => f.type === "error")).toMatchObject({
      code: "UNREPAIRABLE",
    });
    // The tokens the discarded round cost are still booked.
    expect(result.inputTokens).toBe(105);
  });

  it("keeps the saved workflow when the run repair comes back unreadable", async () => {
    const { deps, frames, save, saved } = harness(
      [
        llmResult(FIXED_DRAFT),
        { content: '```json\n{ "nodes": [', inputTokens: 5, outputTokens: 5 },
      ],
      {},
      ["error"]
    );

    const result = await runGenerationPipeline(deps);

    // Nothing overwrote what already ran, and the workflow is still theirs.
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe("partial");
    expect(result.workflowId).toBe("wf-1");
    expect(result.workflow).toBe(saved[0]);
    expect(
      frames.some(
        (f) =>
          f.type === "log" && f.level === "warn" && f.message.includes("kept")
      )
    ).toBe(true);
  });

  it("stops when cancelled", async () => {
    const { deps, frames, save } = harness([llmResult(FIXED_DRAFT)], {
      isCancelled: () => true,
    });

    const result = await runGenerationPipeline(deps);

    expect(result.outcome).toBe("failed");
    expect(save).not.toHaveBeenCalled();
    expect(frames.find((f) => f.type === "error")).toMatchObject({
      code: "CANCELLED",
    });
  });
});

/**
 * The trace is what the evaluation harnesses are built on, and they can only be
 * run with billed model calls — so its contract is held here, where it is free.
 */
describe("the pipeline trace", () => {
  it("records every stage of a clean generation, in order", async () => {
    const { deps } = harness([llmResult(DRAFT_WITH_EXAMPLES)]);

    const { trace } = await runGenerationPipeline(deps);

    expect(trace.map((entry) => entry.stage)).toEqual([
      "select",
      "draft",
      "hydrate",
      "validate",
      "save",
      "run",
    ]);
    expect(trace.every((entry) => entry.ok)).toBe(true);
    expect(firstFailure(trace)).toBeUndefined();
  });

  it("attributes a repaired generation to the validate stage", async () => {
    const { deps } = harness([llmResult(BROKEN_DRAFT), llmResult(FIXED_DRAFT)]);

    const { trace } = await runGenerationPipeline(deps);

    // The first thing that went wrong is what the harness reports, and it is
    // the type mismatch rather than anything downstream of it.
    const failure = firstFailure(trace);
    expect(failure?.stage).toBe("validate");
    expect(failure).toMatchObject({ attempt: 0, fatal: ["TYPE_MISMATCH"] });

    // Both rounds are on the record, named by which prompt produced them.
    const drafts = trace.filter((entry) => entry.stage === "draft");
    expect(drafts.map((entry) => entry.kind)).toEqual(["initial", "repair"]);

    // And the second validate is clean, which is what makes the pair readable
    // as "it was broken, then it was fixed".
    const validations = trace.filter((entry) => entry.stage === "validate");
    expect(validations.map((entry) => entry.ok)).toEqual([false, true]);
  });

  it("names the node types the model invented", async () => {
    const { deps } = harness([
      llmResult({
        ...FIXED_DRAFT,
        nodes: [
          ...FIXED_DRAFT.nodes,
          { id: "ghost", type: "summarize-everything" },
        ],
      }),
      llmResult(FIXED_DRAFT),
    ]);

    const { trace } = await runGenerationPipeline(deps);

    // The silent-discard stage: hydration drops the node and the graph carries
    // on without it, so nothing downstream can say the request lost a step.
    const hydrate = trace.find((entry) => entry.stage === "hydrate");
    expect(hydrate).toMatchObject({
      ok: false,
      drafted: 4,
      droppedTypes: ["summarize-everything"],
    });
  });

  it("records an unreadable revision as a failed draft, with the reason", async () => {
    const { deps } = harness([
      llmResult(BROKEN_DRAFT),
      { content: "cut off mid-", inputTokens: 5, outputTokens: 5 },
    ]);

    const { trace } = await runGenerationPipeline(deps);

    const drafts = trace.filter((entry) => entry.stage === "draft");
    expect(drafts[1]).toMatchObject({ ok: false, kind: "repair" });
    expect(drafts[1]).toHaveProperty("reason");
  });

  it("flags a promised destination that never reached the catalog", async () => {
    // `share-post-x` needs an account this org has not linked, so eligibility
    // withholds it — and forcing it in as `required` must not smuggle it past.
    // The generation is then doomed before the first token: the prompt names a
    // delivery node whose ports the model cannot see.
    const { deps } = harness([llmResult(DRAFT_WITH_EXAMPLES)], {
      destination: {
        id: "x",
        kind: "integration" as const,
        label: "post it to X",
        nodeTypes: ["share-post-x"],
      },
    });

    const { trace } = await runGenerationPipeline(deps);

    const select = trace.find((entry) => entry.stage === "select");
    expect(select).toMatchObject({
      ok: false,
      missingRequired: ["share-post-x"],
    });
    // And it is the first failure, so a harness attributes the whole sample to
    // selection rather than to the delivery check that fires later.
    expect(firstFailure(trace)?.stage).toBe("select");
  });

  it("survives a generation that produced nothing", async () => {
    const { deps } = harness([
      { content: "I cannot help with that.", inputTokens: 5, outputTokens: 5 },
    ]);

    const { trace } = await runGenerationPipeline(deps);

    // A generation that produced nothing is exactly the one whose stages are
    // worth reading, so the trace has to survive the catch.
    expect(trace.map((entry) => entry.stage)).toEqual(["select"]);
  });
});

describe("formatRunFailures", () => {
  const workflow = {
    id: "wf-1",
    name: "Echo",
    trigger: "manual",
    nodes: [{ id: "conv", type: "to-string" }],
    edges: [],
  } as unknown as Workflow;

  it("names the node, its type and what it said", () => {
    const failed = {
      ...execution("error"),
      nodeExecutions: [
        { nodeId: "conv", status: "error", error: "boom", usage: 0 },
        { nodeId: "sink", status: "completed", usage: 0 },
      ],
    } as WorkflowExecution;

    const formatted = formatRunFailures(failed, workflow);

    expect(formatted).toBe('1. node "conv" (type to-string): boom');
    // A node that worked is not something to fix.
    expect(formatted).not.toContain("sink");
  });

  it("says so when the run failed with no node error at all", () => {
    const failed = { ...execution("exhausted"), error: "out of credits" };

    expect(formatRunFailures(failed, workflow)).toBe(
      'The run ended with status "exhausted": out of credits'
    );
  });
});

describe("isRunImprovement", () => {
  const withFailures = (
    status: WorkflowExecution["status"],
    failures: number
  ): WorkflowExecution =>
    ({
      ...execution(status),
      nodeExecutions: Array.from({ length: failures }, (_, index) => ({
        nodeId: `n${index}`,
        status: "error",
        error: "boom",
        usage: 0,
      })),
    }) as WorkflowExecution;

  it("accepts a repair that makes the run complete", () => {
    expect(
      isRunImprovement(withFailures("completed", 0), withFailures("error", 2))
    ).toBe(true);
  });

  it("accepts a repair that leaves fewer steps broken", () => {
    expect(
      isRunImprovement(withFailures("error", 1), withFailures("error", 2))
    ).toBe(true);
  });

  // The shape that made the loop diverge: the original failure survives and
  // the round brings new ones with it.
  it("rejects a repair that breaks more than it fixed", () => {
    expect(
      isRunImprovement(withFailures("error", 3), withFailures("error", 2))
    ).toBe(false);
  });

  it("rejects a repair that changed nothing", () => {
    expect(
      isRunImprovement(withFailures("error", 2), withFailures("error", 2))
    ).toBe(false);
  });

  it("never trades a completed run for a broken one", () => {
    expect(
      isRunImprovement(withFailures("error", 0), withFailures("completed", 0))
    ).toBe(false);
  });
});

describe("selectCandidates", () => {
  it("withholds subscription nodes from a trial org", () => {
    const { candidates, withheld } = selectCandidates(
      "post a slack message",
      FIXTURE_NODE_TYPES,
      new Set()
    );

    expect(candidates.map((c) => c.type)).not.toContain("send-slack-message");
    expect(withheld.some((w) => w.type === "send-slack-message")).toBe(true);
  });

  it("still withholds an integration node when the provider is unconnected", () => {
    const { candidates } = selectCandidates(
      "post a slack message",
      FIXTURE_NODE_TYPES,
      new Set()
    );

    expect(candidates.map((c) => c.type)).not.toContain("send-slack-message");
  });

  it("admits it once the org is pro and the provider is connected", () => {
    const { candidates } = selectCandidates(
      "post a slack message",
      FIXTURE_NODE_TYPES,
      new Set(["slack"])
    );

    expect(candidates.map((c) => c.type)).toContain("send-slack-message");
  });

  it("names the unconnected provider the request was reaching for", () => {
    const { withheld } = selectCandidates(
      "post a slack message",
      FIXTURE_NODE_TYPES,
      new Set()
    );

    // Only Slack. X and WordPress are also withheld and also share the token
    // "post", but naming them here would tell someone who asked about Slack
    // about two services they never mentioned.
    expect(withheldProviders(withheld)).toEqual(["slack"]);
  });

  it("never offers trigger or responder nodes", () => {
    const { candidates } = selectCandidates(
      "when an email arrives",
      FIXTURE_NODE_TYPES,
      new Set()
    );

    expect(candidates.map((c) => c.type)).not.toContain("receive-email");
    expect(candidates.map((c) => c.type)).not.toContain("http-response");
  });

  it("always includes the AI stand-ins and core output nodes", () => {
    const { candidates } = selectCandidates(
      "do something unrelated",
      FIXTURE_NODE_TYPES,
      new Set()
    );

    const types = candidates.map((c) => c.type);
    // The agent node carries text generation now that `ai-text` is gone.
    expect(types).toContain("agent-claude-sonnet-4");
    expect(types).toContain("output-text");
  });
});

describe("token accounting", () => {
  it("books composition against the synthesis tier", async () => {
    const { deps } = harness([llmResult(DRAFT_WITH_EXAMPLES)]);
    const result = await runGenerationPipeline(deps);

    // The two tiers are priced an order of magnitude apart, so which one spent
    // the tokens is the whole point of tracking them separately.
    expect(result.usage.synthesis).toEqual({
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(result.usage.fast).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("keeps the totals equal to the sum of the tiers", async () => {
    const { deps } = harness([
      llmResult(BROKEN_DRAFT),
      llmResult(DRAFT_WITH_EXAMPLES),
    ]);
    const result = await runGenerationPipeline(deps);

    expect(result.inputTokens).toBe(
      result.usage.fast.inputTokens + result.usage.synthesis.inputTokens
    );
    expect(result.outputTokens).toBe(
      result.usage.fast.outputTokens + result.usage.synthesis.outputTokens
    );
    expect(result.inputTokens).toBe(200);
  });

  it("reports usage even when the run fails outright", async () => {
    const { deps } = harness([
      llmResult(BROKEN_DRAFT),
      llmResult(BROKEN_DRAFT),
    ]);
    const result = await runGenerationPipeline(deps);

    expect(result.outcome).toBe("failed");
    expect(result.usage.synthesis.inputTokens).toBeGreaterThan(0);
  });
});

describe("the destination contract in the pipeline", () => {
  it("tells the model where the result has to go, then enforces it", async () => {
    const emailDestination = {
      id: "email",
      kind: "email" as const,
      label: "email it to you",
      nodeTypes: ["send-email"],
    };

    // Both drafts deliver into a widget, so neither satisfies the promise.
    const responses = [
      llmResult(DRAFT_WITH_EXAMPLES),
      llmResult(DRAFT_WITH_EXAMPLES),
    ];
    const systems: string[] = [];
    const { deps, frames } = harness([], {
      destination: emailDestination,
      callLLM: async (call) => {
        systems.push(call.system);
        const next = responses.shift();
        if (!next) throw new Error("callLLM called more times than expected");
        return next;
      },
    });
    const result = await runGenerationPipeline(deps);

    expect(systems[0]).toContain("email it to you");
    expect(systems[0]).toContain("send-email");

    const issues = frames
      .filter((frame) => frame.type === "validation")
      .flatMap((frame) => (frame.type === "validation" ? frame.issues : []));
    expect(issues.map((issue) => issue.code)).toContain(
      "DESTINATION_NOT_REALIZED"
    );
    expect(result.outcome).toBe("failed");
  });
});

describe("the delivery node reaches the catalog", () => {
  it("is offered even when the request never hints at it", () => {
    // "send-email" scores nothing against a request about blog posts, but the
    // destination defaults to email for any manual workflow — so without this
    // the model is told to use a type whose ports it cannot see.
    const { candidates } = selectCandidates(
      "post my blog updates somewhere",
      FIXTURE_NODE_TYPES,
      new Set(),
      ["send-email"]
    );

    expect(candidates.map((c) => c.type)).toContain("send-email");
  });

  it("is not offered when nothing requires it", () => {
    const { candidates } = selectCandidates(
      "post my blog updates somewhere",
      FIXTURE_NODE_TYPES,
      new Set()
    );

    expect(candidates.map((c) => c.type)).not.toContain("send-email");
  });

  it("still withholds a required type the org cannot execute", () => {
    // Forcing a type into the catalog must not smuggle it past eligibility —
    // this one needs an OAuth account that is not linked.
    const { candidates } = selectCandidates(
      "post it somewhere",
      FIXTURE_NODE_TYPES,
      new Set(),
      ["share-post-x"]
    );

    expect(candidates.map((c) => c.type)).not.toContain("share-post-x");
  });

  it("threads the destination through from the pipeline", async () => {
    const emailDestination = {
      id: "email",
      kind: "email" as const,
      label: "email it to you",
      nodeTypes: ["send-email"],
    };
    const systems: string[] = [];
    const { deps } = harness([], {
      destination: emailDestination,
      prompt: "summarize a blog post",
      callLLM: async (call) => {
        systems.push(call.system);
        return llmResult(DRAFT_WITH_EXAMPLES);
      },
    });

    await runGenerationPipeline(deps);

    // Present in the catalog section, not merely named by the delivery rule.
    expect(systems[0]).toContain("Send Email");
  });
});

describe("telling the user what was withheld", () => {
  /**
   * The reported case: "check on a schedule for new posts on my blog…" built
   * something with no WordPress in it and said nothing about why. The nodes
   * exist and the ranker finds them — they are withheld because the account is
   * not connected, and that fact used to be dropped silently.
   */
  it("names an unconnected provider the request was reaching for", () => {
    const { withheld } = selectCandidates(
      "check on a schedule for new posts on my blog and email me a summary",
      FIXTURE_NODE_TYPES,
      new Set(),
      []
    );

    expect(withheldProviders(withheld)).toContain("wordpress");
  });

  it("stays quiet about providers the request never reached for", () => {
    const { withheld } = selectCandidates(
      "count the rows in my database",
      FIXTURE_NODE_TYPES,
      new Set(),
      []
    );

    // The noise this replaced: six "not connected" lines about services the
    // person had not mentioned, on a page that shows one column of prose.
    expect(withheldProviders(withheld)).toEqual([]);
  });

  it("names a workspace resource the request was reaching for", () => {
    const { withheld } = selectCandidates(
      "put a message on my queue",
      FIXTURE_NODE_TYPES,
      new Set(),
      []
    );

    expect(withheldResources(withheld)).toContain("queue");
  });
});

/**
 * A scheduled pass-through: the trigger's own timestamp is the only input, so
 * the generated example has nothing to contribute to the run.
 */
const SCHEDULED_PASSTHROUGH_DRAFT = {
  title: "Tick",
  description: "Shows the tick time",
  trigger: "scheduled",
  steps: ["Show the time"],
  nodes: [{ id: "sink", type: "output-text" }],
  edges: [
    {
      source: "trigger",
      sourceOutput: "timestamp",
      target: "sink",
      targetInput: "value",
    },
  ],
};

describe("what run_result claims about sample data", () => {
  it("names the sample when invented input actually drove the run", async () => {
    const { deps, frames } = harness([llmResult(DRAFT_WITH_EXAMPLES)]);
    await runGenerationPipeline(deps);

    const result = frames.find((f) => f.type === "run_result");
    expect(result).toBeDefined();
    expect(result?.type === "run_result" && result.sampleName).toBe(
      "Small object"
    );
  });

  it("stays silent when the example contributed nothing", async () => {
    // The old behaviour captioned every run "made-up sample data" because an
    // example always exists — including runs that read only real sources.
    // Apologising for magic that actually happened is the one thing worse
    // than either honest answer.
    const { deps, frames } = harness([llmResult(SCHEDULED_PASSTHROUGH_DRAFT)]);
    const outcome = await runGenerationPipeline(deps);

    expect(outcome.outcome).toBe("ok");
    const result = frames.find((f) => f.type === "run_result");
    expect(result).toBeDefined();
    expect(
      result?.type === "run_result" ? result.sampleName : "present"
    ).toBeUndefined();
  });
});

describe("dormant workflows and their disarmed bindings", () => {
  it("flags the save as dormant and returns what was blanked", async () => {
    // The registry ships the schedule input with a default; the fixture
    // does not, so mirror the real shape here.
    const scheduled = FIXTURE_NODE_TYPES.find(
      (nt) => nt.type === "receive-scheduled-trigger"
    )!;
    const armedScheduled: typeof scheduled = {
      ...scheduled,
      inputs: [
        {
          name: "scheduleExpression",
          type: "string",
          value: "0 0 * * *",
        } as (typeof scheduled.inputs)[number],
      ],
    };
    const nodeTypes = FIXTURE_NODE_TYPES.map((nodeType) =>
      nodeType.type === "receive-scheduled-trigger" ? armedScheduled : nodeType
    );

    const { deps, frames, saved } = harness([
      llmResult(SCHEDULED_PASSTHROUGH_DRAFT),
    ]);
    const outcome = await runGenerationPipeline({ ...deps, nodeTypes });

    // The stored graph is dormant, the frame says so, and the result carries
    // the only copy of what "turn it on" must write back.
    const savedFrame = frames.find((f) => f.type === "saved");
    expect(savedFrame?.type === "saved" && savedFrame.dormant).toBe(true);
    expect(outcome.disarmed).toEqual([
      {
        nodeId: "trigger",
        inputName: "scheduleExpression",
        value: "0 0 * * *",
      },
    ]);

    const trigger = saved[0].nodes.find((n) => n.id === "trigger");
    expect(
      trigger?.inputs.find((i) => i.name === "scheduleExpression")?.value
    ).toBeUndefined();
  });

  it("leaves a manual workflow undormant", async () => {
    const { deps, frames } = harness([
      llmResult(BROKEN_DRAFT),
      llmResult(FIXED_DRAFT),
    ]);
    const outcome = await runGenerationPipeline(deps);

    const savedFrame = frames.find((f) => f.type === "saved");
    expect(savedFrame?.type === "saved" && savedFrame.dormant).toBeFalsy();
    expect(outcome.disarmed).toEqual([]);
  });
});

describe("creating workspace components", () => {
  /** A report workflow leaning on a database the org does not have yet. */
  const DB_DRAFT = {
    title: "Report",
    description: "Queries the reports database",
    trigger: "manual",
    steps: ["Query", "Show"],
    nodes: [
      { id: "q", type: "database-execute", inputs: { sql: "select 1" } },
      { id: "conv", type: "to-string" },
      { id: "sink", type: "output-text" },
    ],
    edges: [
      {
        source: "q",
        sourceOutput: "rows",
        target: "conv",
        targetInput: "value",
      },
      {
        source: "conv",
        sourceOutput: "result",
        target: "sink",
        targetInput: "value",
      },
    ],
    examples: [{ name: "Basic" }],
    resources: [
      {
        family: "database",
        action: "create",
        name: "Reports",
        description: "Rolling report data",
      },
    ],
  };

  const createStub = () =>
    vi.fn(async (_type: string, spec: { name: string }) => ({
      id: "db-9",
      name: spec.name,
    }));

  it("creates the component, binds it, and announces it once", async () => {
    const createResource = createStub();
    const { deps, frames, saved } = harness([llmResult(DB_DRAFT)], {
      orgResources: {},
      createResource,
    });

    const result = await runGenerationPipeline(deps);

    expect(result.outcome).toBe("ok");
    expect(createResource).toHaveBeenCalledWith("database", {
      name: "Reports",
      description: "Rolling report data",
    });

    // Bound before validation, so the required input is satisfied.
    const query = saved[0].nodes.find((n) => n.id === "q");
    expect(
      query?.inputs.find((input) => input.name === "databaseId")?.value
    ).toBe("db-9");

    // One "Created …" line; no duplicate "Used your …" line for the same row.
    const logs = frames.filter((f) => f.type === "log");
    expect(
      logs.filter((f) => f.message.includes('Created the database "Reports"'))
    ).toHaveLength(1);
    expect(logs.some((f) => f.message.includes("Used your database"))).toBe(
      false
    );

    expect(result.createdResources).toEqual([
      { type: "database", name: "Reports" },
    ]);
  });

  it("creates once, however many repair rounds re-ask", async () => {
    const createResource = createStub();
    // First round wires the query straight into the text sink — the classic
    // mismatch — so a repair round re-emits the whole draft, resources included.
    const broken = {
      ...DB_DRAFT,
      edges: [
        {
          source: "q",
          sourceOutput: "rows",
          target: "sink",
          targetInput: "value",
        },
      ],
    };
    const { deps } = harness([llmResult(broken), llmResult(DB_DRAFT)], {
      orgResources: {},
      createResource,
    });

    const result = await runGenerationPipeline(deps);

    expect(result.outcome).toBe("ok");
    expect(createResource).toHaveBeenCalledTimes(1);
    expect(result.createdResources).toEqual([
      { type: "database", name: "Reports" },
    ]);
  });

  it("creates nothing when no creator was supplied", async () => {
    const { deps } = harness(
      [llmResult(DB_DRAFT), llmResult(DB_DRAFT), llmResult(DB_DRAFT)],
      { orgResources: {} }
    );

    const result = await runGenerationPipeline(deps);

    // The database input stays unset; without a creator the run cannot avoid
    // the missing-input failure, but it must never invent a resource.
    expect(result.createdResources).toEqual([]);
  });
});

describe("the resume path", () => {
  /** A stored workflow the way adoption sees one: real ids, literal inputs. */
  function storedWorkflow(overrides: Partial<Workflow> = {}): Workflow {
    return {
      id: "wf-existing",
      name: "Adopted",
      description: "echoes a greeting",
      trigger: "manual",
      nodes: [
        {
          id: "text-input-aaa",
          name: "Greeting",
          type: "text-input",
          position: { x: 0, y: 0 },
          inputs: [
            { name: "value", type: "string", value: "hello" },
          ] as Workflow["nodes"][number]["inputs"],
          outputs: [],
        },
        {
          id: "output-text-bbb",
          name: "Result",
          type: "output-text",
          position: { x: 0, y: 0 },
          inputs: [
            { name: "value", type: "string" },
          ] as Workflow["nodes"][number]["inputs"],
          outputs: [],
        },
      ],
      edges: [
        {
          source: "text-input-aaa",
          sourceOutput: "value",
          target: "output-text-bbb",
          targetInput: "value",
        },
      ],
      ...overrides,
    };
  }

  /**
   * The synthetic conversation adoption fabricates for a first critique.
   * Deliberately without `system`: the pipeline composes one from `prompt`,
   * which is what keeps the advertised catalog and the hydration catalog
   * the same set.
   */
  function adoptedResume(workflow: Workflow, note: string) {
    return {
      messages: [
        {
          role: "user" as const,
          content: buildUserPrompt(`${workflow.name}: ${workflow.description}`),
        },
        {
          role: "assistant" as const,
          content: JSON.stringify(workflowToDraft(workflow)),
        },
      ],
      note,
      workflowId: workflow.id,
    };
  }

  it("resumes an adopted conversation and saves under the existing id", async () => {
    const stored = storedWorkflow();
    const revised = workflowToDraft(stored);
    revised.nodes[0].inputs = { value: "goodbye" };

    const { deps, frames, saved, savedUnder, callLLM } = harness(
      [llmResult(revised)],
      {
        prompt: "Adopted: echoes a greeting",
        resume: adoptedResume(stored, "change the greeting to goodbye"),
      }
    );

    const result = await runGenerationPipeline(deps);

    expect(result.outcome).toBe("ok");
    expect(savedUnder[0]).toBe("wf-existing");
    // The corrected literal survived hydration into the saved graph.
    expect(
      saved[0].nodes
        .find((n) => n.id === "text-input-aaa")
        ?.inputs.find((i) => i.name === "value")?.value
    ).toBe("goodbye");
    // One call, carrying a pipeline-composed system prompt (the resume has
    // none) and the critique note.
    expect(callLLM).toHaveBeenCalledTimes(1);
    // The harness mock declares no parameters, so the received call is
    // recovered through unknown.
    const [call] = callLLM.mock.calls[0] as unknown as [
      { system: string; messages: Array<{ role: string; content: string }> },
    ];
    expect(call.system).toContain("text-input");
    expect(call.messages.at(-1)?.content).toContain(
      "change the greeting to goodbye"
    );
    // A resume corrects; it does not re-plan or re-select.
    const phaseList = phases(frames);
    expect(phaseList[0]).toBe("repairing");
    expect(phaseList).not.toContain("selecting");
    expect(phaseList).not.toContain("generating");
  });

  it("replays a stored system prompt verbatim when the resume carries one", async () => {
    const stored = storedWorkflow();
    const { deps, callLLM } = harness([llmResult(workflowToDraft(stored))], {
      prompt: "",
      resume: {
        ...adoptedResume(stored, "keep it as it is"),
        system: "THE STORED SYSTEM PROMPT",
      },
    });

    await runGenerationPipeline(deps);

    const [call] = callLLM.mock.calls[0] as unknown as [{ system: string }];
    expect(call.system).toBe("THE STORED SYSTEM PROMPT");
  });

  it("brings a scheduled adoption back dormant, arming values captured", async () => {
    const stored = storedWorkflow({
      trigger: "scheduled",
      nodes: [
        {
          id: "receive-scheduled-trigger-xyz",
          name: "Every morning",
          type: "receive-scheduled-trigger",
          position: { x: 0, y: 0 },
          inputs: [
            { name: "scheduleExpression", type: "string", value: "0 8 * * *" },
          ] as Workflow["nodes"][number]["inputs"],
          outputs: [],
        },
        {
          id: "to-string-1",
          name: "Stamp",
          type: "to-string",
          position: { x: 0, y: 0 },
          inputs: [
            { name: "value", type: "any" },
          ] as Workflow["nodes"][number]["inputs"],
          outputs: [],
        },
        {
          id: "output-text-bbb",
          name: "Result",
          type: "output-text",
          position: { x: 0, y: 0 },
          inputs: [
            { name: "value", type: "string" },
          ] as Workflow["nodes"][number]["inputs"],
          outputs: [],
        },
      ],
      edges: [
        {
          source: "receive-scheduled-trigger-xyz",
          sourceOutput: "timestamp",
          target: "to-string-1",
          targetInput: "value",
        },
        {
          source: "to-string-1",
          sourceOutput: "result",
          target: "output-text-bbb",
          targetInput: "value",
        },
      ],
    });

    // The model echoes the adopted draft back unchanged — the smallest
    // possible critique response.
    const echoed = workflowToDraft(stored);

    const { deps, frames } = harness([llmResult(echoed)], {
      prompt: "",
      resume: adoptedResume(stored, "keep it as it is"),
    });

    const result = await runGenerationPipeline(deps);

    expect(result.outcome).toBe("ok");
    // The rebuild disarms: the cron line is captured for the arm turn, and
    // the saved frame says so — this is what the rail's paused-notice reads.
    expect(result.disarmed).toEqual([
      {
        nodeId: "trigger",
        inputName: "scheduleExpression",
        value: "0 8 * * *",
      },
    ]);
    const savedFrame = frames.find((f) => f.type === "saved");
    expect(savedFrame).toMatchObject({ type: "saved", dormant: true });
  });
});
