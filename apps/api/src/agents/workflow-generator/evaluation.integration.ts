import { env } from "cloudflare:test";
import type { NodeType, Workflow, WorkflowExecution } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { CloudflareNodeRegistry } from "../../runtime/cloudflare-node-registry";
import { WorkflowExecutor } from "../../services/workflow-executor";
import type { EvaluationCase } from "./evaluation-cases";
import { EVALUATION_CASES } from "./evaluation-cases";
import {
  createModelRouter,
  parseModelOverride,
  resolveTier,
} from "./model-router";
import type { OutputProblem } from "./output-checks";
import { checkDelivered, deliveredText } from "./output-checks";
import { runGenerationPipeline } from "./pipeline";
import type { TraceEntry } from "./trace";
import { firstFailure, summarize } from "./trace";

/**
 * Does a generated workflow do the job? — the question the benchmark cannot ask.
 *
 * `benchmark.integration.ts` stubs `save` and `run` because it measures whether
 * a valid graph comes out. That is a real measurement and this does not replace
 * it; it adds the axis above it. A workflow can validate, run to completion and
 * still deliver the prompt that was meant to produce the answer, and every
 * structural check passes while it does.
 *
 * So this one actually executes the graph and reads what came out the far end.
 * Cases are text-only by design: the pool stubs the image and sandbox wasm, and
 * a request that reached one of those would execute a stub rather than a node.
 *
 *   pnpm --filter '@dafthunk/api' eval:generate
 *
 * `EVAL_RUNS` sets samples per case (default 1). Generation is stochastic, so a
 * single sample says very little — raise it when comparing two models, and
 * expect the cost to rise with it.
 *
 * `EVAL_MODEL` swaps the synthesis tier for one run, as `provider:model`, so a
 * comparison is two commands rather than two edits to `config.ts`:
 *
 *   EVAL_RUNS=3 EVAL_MODEL=anthropic:claude-opus-5 pnpm --filter '@dafthunk/api' eval:generate
 *
 * Both are printed before the first call. An `EVAL_MODEL` that fails to parse
 * is ignored rather than fatal, and the printed line is the only thing that
 * distinguishes that from a sweep that ran.
 */

const bindings = env as unknown as Bindings;

const CATALOG: NodeType[] = new CloudflareNodeRegistry(
  bindings,
  false
).getNodeTypes();

/** Delivered as bindings, since `process.env` does not cross into workerd. */
interface EvalEnv {
  EVAL_RUNS?: string;
  /**
   * `provider:model`, overriding the synthesis tier for this run.
   *
   * What makes a model sweep a command rather than a source edit — the two
   * numbers worth comparing are pass rate and cost, and neither can be had by
   * changing `config.ts` between runs and remembering which was which.
   */
  EVAL_MODEL?: string;
}

const RUNS = Number((env as unknown as EvalEnv).EVAL_RUNS ?? "1");

const OVERRIDES = parseModelOverride((env as unknown as EvalEnv).EVAL_MODEL);
const ROUTE = createModelRouter(bindings, OVERRIDES);

/** What actually answered, which is not always what `config.ts` declares. */
const SYNTHESIS = resolveTier("synthesis", OVERRIDES);

// Announced before the first model call rather than only in the closing
// summary. `EVAL_RUNS` reaches the pool as a binding, and when that breaks it
// does not fail — it quietly reads 1, which is indistinguishable from a run
// that was meant to be single-sample until the bill arrives. The same is true
// of an `EVAL_MODEL` that failed to parse: it silently measures the configured
// model while the operator believes they swept a different one.
console.log(
  `[eval] ${RUNS} sample(s) per case, synthesis=${SYNTHESIS.provider}:${SYNTHESIS.model}${
    OVERRIDES ? " (overridden by EVAL_MODEL)" : ""
  }`
);

/** Synthetic owner. Credit checks are off and the DB writes are best-effort. */
const USER_ID = "eval-user";
const ORG_ID = "eval-org";

interface Sample {
  caseId: string;
  /** The graph validated and saved. What the benchmark already measures. */
  built: boolean;
  /** The run finished without a node erroring. */
  ran: boolean;
  /** Nothing deterministic is wrong with what it delivered. */
  clean: boolean;
  problems: OutputProblem[];
  delivered: string[];
  /**
   * Every node type in the graph, not just how many.
   *
   * A count cannot answer the question the catalog exists to settle — which
   * shapes the generator reached for. Swapping the offered agent node and
   * reading the pass rate afterwards measures nothing if the graphs never
   * contained one, and a count of 4 looks identical either way.
   */
  nodeTypes: string[];
  /**
   * How generation itself ended.
   *
   * `built` only tests for `failed`, so a `partial` run — repairs exhausted,
   * every node dropped as unknown — reported `built=true ran=true nodes=0` and
   * read as a delivery problem rather than a generation one. Two rounds of
   * diagnosis went into the wrong half of the pipeline for want of this word.
   */
  outcome?: string;
  error?: string;
  /**
   * The first stage that did not do its job, or undefined when they all did.
   *
   * The number this suite exists to produce. A pass rate says how often the
   * generator is wrong; this says *where*, and the difference is the whole
   * distance between "quality dropped" and something anyone can act on.
   *
   * Undefined on a failing sample is itself a finding: every stage worked and
   * the model still wrote the wrong thing, which is a prompt or model problem
   * rather than a pipeline one.
   */
  stage?: string;
  trace: TraceEntry[];
}

/** Node types in graph order, from the trace so a failed generation still reports. */
function nodeTypesOf(trace: TraceEntry[]): string[] {
  for (let index = trace.length - 1; index >= 0; index--) {
    const entry = trace[index];
    if (entry.stage === "hydrate") return entry.types;
  }
  return [];
}

/** Where a sample went wrong, in one word, for the aggregate table. */
function stageOf(trace: TraceEntry[]): string | undefined {
  return firstFailure(trace)?.stage;
}

async function runSample(testCase: EvaluationCase): Promise<Sample> {
  let execution: WorkflowExecution | undefined;
  // Kept outside the try so a throw still reports the stages that ran.
  let trace: TraceEntry[] = [];

  try {
    const result = await runGenerationPipeline({
      prompt: testCase.prompt,
      nodeTypes: CATALOG,
      // Nothing linked: the eval must not depend on which accounts happen to be
      // connected to whatever workspace it runs against.
      connectedProviders: new Set<string>(),
      // The Durable Object's own dispatch, so what is measured is what ships.
      callLLM: ROUTE,
      // Frames are the browser's channel and this suite no longer reads them.
      // It used to scrape `graph` to recover the workflow, which is how a
      // measurement harness ended up depending on a UI contract — and why it
      // could only ever see the two endpoints rather than the stages between.
      emit: () => {},
      save: async () => "eval-workflow",
      // The real executor, because the whole point is what the nodes produce.
      // The pipeline always asks for a rehearsal, and the flag is forwarded
      // faithfully: outward writes are stubbed at the registry level, which is
      // what makes it safe to include provider-node prompts in the case set —
      // this harness used to be one nobody dared point at a real account.
      run: async (
        workflow,
        workflowId,
        parameters,
        inputOverrides,
        options
      ) => {
        const outcome = await WorkflowExecutor.execute({
          workflow: {
            id: workflowId,
            name: workflow.name,
            trigger: workflow.trigger,
            runtime: "worker",
            nodes: workflow.nodes,
            edges: workflow.edges,
          },
          userId: USER_ID,
          organizationId: ORG_ID,
          computeCredits: 0,
          unlimitedUsage: true,
          parameters,
          ...(inputOverrides && { inputOverrides }),
          ...(options?.rehearsal && { rehearsal: true }),
          env: bindings,
        });
        execution = outcome.execution;
        return outcome.execution;
      },
    });

    trace = result.trace;
    const finalWorkflow: Workflow | undefined = result.workflow;

    if (!finalWorkflow || result.outcome === "failed") {
      return {
        caseId: testCase.id,
        built: false,
        ran: false,
        clean: false,
        problems: [],
        delivered: [],
        nodeTypes: nodeTypesOf(trace),
        outcome: result.outcome,
        stage: stageOf(trace),
        trace,
        error: "generation failed",
      };
    }

    if (!execution) {
      return {
        caseId: testCase.id,
        built: true,
        ran: false,
        clean: false,
        problems: [],
        delivered: [],
        nodeTypes: nodeTypesOf(trace),
        outcome: result.outcome,
        stage: stageOf(trace),
        trace,
        error: "never ran",
      };
    }

    const problems = checkDelivered(finalWorkflow, execution, {
      expectsProse: testCase.expectsProse,
      ...(testCase.maxChars !== undefined && { maxChars: testCase.maxChars }),
    });

    const delivered = deliveredText(finalWorkflow, execution);

    if (testCase.expectMentions?.length) {
      const haystack = delivered.join("\n").toLowerCase();
      const missing = testCase.expectMentions.filter(
        (word) => !haystack.includes(word)
      );
      if (missing.length) {
        problems.push({
          code: "OFF_TOPIC",
          message: `Delivered text never mentions: ${missing.join(", ")}`,
        });
      }
    }

    return {
      caseId: testCase.id,
      built: true,
      ran: execution.status === "completed",
      clean: problems.length === 0,
      problems,
      delivered,
      nodeTypes: nodeTypesOf(trace),
      outcome: result.outcome,
      stage: stageOf(trace),
      trace,
    };
  } catch (error) {
    return {
      caseId: testCase.id,
      built: false,
      ran: false,
      clean: false,
      problems: [],
      delivered: [],
      nodeTypes: nodeTypesOf(trace),
      stage: stageOf(trace),
      trace,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const HEAD_CHARS = 1200;
const TAIL_CHARS = 400;

/**
 * A long delivery, shown from both ends.
 *
 * The head alone was not enough: `TRUNCATED` is a claim about how the text
 * *ends*, and a log that cut the text off at a fixed length made every such
 * finding impossible to confirm from the artifact — the evidence and the
 * logger's own truncation looked identical. Whatever else is dropped, the last
 * few lines are the ones the finding is about.
 */
function excerpt(text: string): string {
  if (text.length <= HEAD_CHARS + TAIL_CHARS) return text;

  const dropped = text.length - HEAD_CHARS - TAIL_CHARS;
  return (
    `${text.slice(0, HEAD_CHARS)}\n` +
    `  … [${dropped} characters omitted by this report] …\n` +
    `${text.slice(-TAIL_CHARS)}`
  );
}

/**
 * The whole sample, printed.
 *
 * There is no filesystem in the pool, so the artifact is the log — and it has
 * to carry enough to diagnose from, because the reason this failure reached a
 * real inbox is that a pass rate alone never says what came out.
 */
function report(sample: Sample): void {
  const status = sample.clean ? "PASS" : "FAIL";
  console.log(
    `\n[eval] ${status} ${sample.caseId} ` +
      `(built=${sample.built} ran=${sample.ran} ` +
      `outcome=${sample.outcome ?? "?"} nodes=${sample.nodeTypes.length}` +
      `${sample.stage ? ` broke-at=${sample.stage}` : ""})`
  );
  if (sample.nodeTypes.length) {
    console.log(`  types: ${sample.nodeTypes.join(", ")}`);
  }
  if (sample.error) console.log(`  error: ${sample.error}`);
  for (const problem of sample.problems) {
    console.log(`  ${problem.code}: ${problem.message}`);
  }

  // Every stage, for a sample that went wrong. This is the artifact: there is
  // no filesystem in the pool, so a failure that cannot be diagnosed from the
  // log cannot be diagnosed at all — and "it delivered the wrong thing" with
  // no stages under it is what sent two rounds of diagnosis into the wrong
  // half of the pipeline.
  if (!sample.clean) {
    console.log("  --- stages ---");
    for (const entry of sample.trace) {
      console.log(`  ${entry.ok ? " " : "!"} ${summarize(entry)}`);
    }
  }

  for (const text of sample.delivered) {
    console.log(`  --- delivered (${text.length} chars) ---\n${excerpt(text)}`);
  }
}

describe("workflow generator evaluation", () => {
  const samples: Sample[] = [];

  for (const testCase of EVALUATION_CASES) {
    it(`delivers something usable for "${testCase.id}"`, async () => {
      for (let run = 0; run < RUNS; run++) {
        const sample = await runSample(testCase);
        samples.push(sample);
        report(sample);
      }

      // Reported rather than asserted while the approach is being tried out:
      // the first run of this suite is a measurement, and turning it into a
      // gate before anyone has seen the number just blocks the branch.
      expect(samples.some((sample) => sample.caseId === testCase.id)).toBe(
        true
      );
    }, 300_000);
  }

  it("delivers something usable in every sample", () => {
    const total = samples.length;
    if (total === 0) return;

    const built = samples.filter((s) => s.built).length;
    const ran = samples.filter((s) => s.ran).length;
    const clean = samples.filter((s) => s.clean).length;

    const byCode = new Map<string, number>();
    for (const sample of samples) {
      for (const problem of sample.problems) {
        byCode.set(problem.code, (byCode.get(problem.code) ?? 0) + 1);
      }
    }

    /**
     * Where the failures are, which is the question a pass rate cannot answer.
     *
     * `content` is the bucket that matters most: every stage did its job and
     * the delivery was still wrong. That is a prompt or a model problem, and it
     * is the only bucket that is *not* fixed by changing the pipeline — telling
     * it apart from the others is the whole point of the trace.
     */
    const byStage = new Map<string, number>();
    for (const sample of samples) {
      if (sample.clean) continue;
      const stage = sample.stage ?? "content";
      byStage.set(stage, (byStage.get(stage) ?? 0) + 1);
    }

    const report = [
      // The model that actually answered, not the one configured — a sweep
      // whose report names the wrong model is worse than no report.
      `model=${SYNTHESIS.provider}:${SYNTHESIS.model} runs=${RUNS}`,
      `  ${built}/${total} built a valid graph`,
      `  ${ran}/${total} ran to completion`,
      `  ${clean}/${total} delivered something usable`,
      // The gap between the second and third numbers is the whole reason this
      // suite exists: everything in it passes the benchmark.
      `  ${ran - clean}/${total} ran cleanly but delivered something wrong`,
      "  failures by stage:",
      ...[...byStage]
        .sort((a, b) => b[1] - a[1])
        .map(([stage, count]) => `    ${stage}: ${count}`),
      ...[...byCode]
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => `  ${code}: ${count}`),
      ...samples
        .filter((sample) => !sample.clean)
        .map(
          (sample) =>
            `  ${sample.caseId} [${sample.stage ?? "content"}]: ${
              sample.error ??
              sample.problems.map((problem) => problem.code).join(", ")
            }\n    ${(sample.delivered[0] ?? "").slice(0, 400).replace(/\n/g, "\n    ")}`
        ),
    ].join("\n");

    console.log(`\n[eval]\n${report}\n`);

    // Asserted, not merely printed. The pool can swallow a console line, and a
    // suite that measures everything and reports nothing is how the failure it
    // exists to catch reached a real inbox in the first place.
    expect(clean, `\n${report}\n`).toBe(total);
  });
});
