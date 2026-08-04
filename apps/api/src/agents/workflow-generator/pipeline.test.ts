import type { InputOverrides } from "@dafthunk/runtime";
import type {
  GeneratorServerMessage,
  Workflow,
  WorkflowExample,
  WorkflowExecution,
} from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { withheldProviders } from "./eligibility";
import { FIXTURE_NODE_TYPES } from "./fixtures";
import type { GenerateResult, PipelineDependencies } from "./pipeline";
import {
  formatRunFailures,
  runGenerationPipeline,
  selectCandidates,
} from "./pipeline";

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
    plan: "trial",
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

describe("selectCandidates", () => {
  it("withholds subscription nodes from a trial org", () => {
    const { candidates, withheld } = selectCandidates(
      "post a slack message",
      FIXTURE_NODE_TYPES,
      "trial",
      new Set()
    );

    expect(candidates.map((c) => c.type)).not.toContain("send-slack-message");
    expect(withheld.some((w) => w.type === "send-slack-message")).toBe(true);
  });

  it("still withholds an integration node when the provider is unconnected", () => {
    const { candidates } = selectCandidates(
      "post a slack message",
      FIXTURE_NODE_TYPES,
      "pro",
      new Set()
    );

    expect(candidates.map((c) => c.type)).not.toContain("send-slack-message");
  });

  it("admits it once the org is pro and the provider is connected", () => {
    const { candidates } = selectCandidates(
      "post a slack message",
      FIXTURE_NODE_TYPES,
      "pro",
      new Set(["slack"])
    );

    expect(candidates.map((c) => c.type)).toContain("send-slack-message");
  });

  it("names the unconnected providers it had to withhold", () => {
    const { withheld } = selectCandidates(
      "post a slack message",
      FIXTURE_NODE_TYPES,
      "pro",
      new Set()
    );

    expect(withheldProviders(withheld)).toEqual(["slack"]);
  });

  it("never offers trigger or responder nodes", () => {
    const { candidates } = selectCandidates(
      "when an email arrives",
      FIXTURE_NODE_TYPES,
      "pro",
      new Set()
    );

    expect(candidates.map((c) => c.type)).not.toContain("receive-email");
    expect(candidates.map((c) => c.type)).not.toContain("http-response");
  });

  it("always includes the AI stand-ins and core output nodes", () => {
    const { candidates } = selectCandidates(
      "do something unrelated",
      FIXTURE_NODE_TYPES,
      "trial",
      new Set()
    );

    const types = candidates.map((c) => c.type);
    expect(types).toContain("ai-text");
    expect(types).toContain("output-text");
  });
});
