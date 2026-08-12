import { env } from "cloudflare:test";
import { validateWorkflow } from "@dafthunk/runtime";
import type { NodeType, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { CloudflareNodeRegistry } from "../../runtime/cloudflare-node-registry";
import { findStructuralProblems } from "../../templates/template-test-utils";
import type { GenerationCase } from "./benchmark-cases";
import { BENCHMARK_CASES, COVERAGE_CASES } from "./benchmark-cases";
import {
  createModelRouter,
  parseModelOverride,
  resolveTier,
} from "./model-router";
import type { OrgResources } from "./org-resources";
import type { GenerateCall } from "./pipeline";
import { runGenerationPipeline } from "./pipeline";
import type { TraceEntry } from "./trace";
import { firstFailure, summarize } from "./trace";

/**
 * Quality gauge for the generator, measured against the 23 shipped templates.
 *
 * This makes real, billed model calls, which is why it lives in the integration
 * tier and is not run by CI. It reports a pass rate rather than asserting
 * 23/23 — the number is the thing to optimize, and it is also how the choice of
 * model gets settled: run it on two tiers and compare rate against cost.
 *
 *   pnpm --filter '@dafthunk/api' benchmark:generate
 *
 * `EVAL_MODEL` swaps the synthesis tier for one run, as `provider:model`, which
 * is what makes "run it on two tiers and compare rate against cost" a pair of
 * commands rather than a pair of source edits:
 *
 *   EVAL_MODEL=anthropic:claude-opus-5 pnpm --filter '@dafthunk/api' benchmark:generate
 */

/**
 * The template mirrors first, then the cases that cover what no template does.
 * Order matters only for the printed report: a regression in the template set
 * is the louder signal, so it reads first.
 */
const CASES: GenerationCase[] = [
  ...BENCHMARK_CASES.map(({ templateId, prompt, expectTrigger }) => ({
    id: templateId,
    prompt,
    expectTrigger,
  })),
  ...COVERAGE_CASES,
];

/**
 * What the org is pretended to own, so the resource concepts have something to
 * resolve to.
 *
 * Without this the benchmark measures a tenant that owns nothing: `database`,
 * `schema` and `dataset` inputs are optional on every node that carries them,
 * so a graph reaching for a table binds nothing, validates anyway, and scores
 * as a pass. One instance per type on purpose — a single candidate makes
 * "picked the right one" trivial, which keeps the case about whether the model
 * reached for the resource at all.
 *
 * `createResource` stays absent, so nothing is invented: these are reuse
 * targets, and a case that needs a table the org does not own should fail.
 */
const ORG_RESOURCES: OrgResources = {
  database: [
    {
      id: "bench-database",
      name: "Customers",
      description: "One row per customer, keyed by email.",
    },
  ],
  schema: [
    {
      id: "bench-schema",
      name: "Customer enquiry",
      description: "Name, email and a free-text question.",
      // Carried because a form trigger's ports are derived from them. A schema
      // without fields binds and leaves the form with nothing to wire, which is
      // the failure this suite found.
      fields: [
        { name: "name", type: "string", required: true },
        { name: "email", type: "string", required: true },
        { name: "question", type: "string", required: true },
      ],
    },
  ],
  dataset: [
    {
      id: "bench-dataset",
      name: "Product documentation",
      description: "The public docs, chunked for retrieval.",
    },
  ],
  queue: [{ id: "bench-queue", name: "Incoming jobs" }],
  email: [{ id: "bench-mailbox", name: "Support", handle: "support" }],
};

interface CaseResult {
  id: string;
  validFirstTry: boolean;
  validAfterRepair: boolean;
  triggerCorrect: boolean;
  repairs: number;
  error?: string;
  /** The first stage that did not do its job, for a failure worth attributing. */
  stage?: string;
  /** Conditions beyond the trigger that the finished graph did not satisfy. */
  unmet: string[];
  /** Every stage, printed when a case fails. */
  trace: TraceEntry[];
}

/**
 * Resource types the graph bound, read off parameter types rather than input
 * names — the node that carries a `database` input is free to call it whatever
 * it likes, and several do.
 */
function boundResourceTypes(workflow: Workflow): Set<string> {
  const bound = new Set<string>();
  for (const node of workflow.nodes) {
    for (const input of node.inputs) {
      if (
        input.value !== undefined &&
        input.value !== null &&
        input.value !== ""
      ) {
        bound.add(input.type);
      }
    }
  }
  return bound;
}

/** The case's own conditions, checked against the graph that came out. */
function unmetConditions(
  workflow: Workflow,
  testCase: GenerationCase
): string[] {
  const present = new Set(workflow.nodes.map((node) => node.type));
  const unmet: string[] = [];

  for (const requirement of testCase.requires ?? []) {
    if (!requirement.anyOf.some((type) => present.has(type))) {
      unmet.push(
        `nothing can ${requirement.capability} (any of: ${requirement.anyOf.join(", ")})`
      );
    }
  }

  const bound = boundResourceTypes(workflow);
  for (const resource of testCase.binds ?? []) {
    if (!bound.has(resource)) unmet.push(`no ${resource} bound`);
  }

  return unmet;
}

const bindings = env as unknown as Bindings;

// Built once: the registry runs ~476 registrations, and rebuilding it per case
// measures nothing.
const CATALOG: NodeType[] = new CloudflareNodeRegistry(
  bindings,
  false
).getNodeTypes();

/** Delivered as a binding, since `process.env` does not cross into workerd. */
interface BenchmarkEnv {
  EVAL_MODEL?: string;
}

const OVERRIDES = parseModelOverride(
  (env as unknown as BenchmarkEnv).EVAL_MODEL
);
const ROUTE = createModelRouter(bindings, OVERRIDES);

/** What actually answered, which is not always what `config.ts` declares. */
const SYNTHESIS = resolveTier("synthesis", OVERRIDES);

console.log(
  `[benchmark] synthesis=${SYNTHESIS.provider}:${SYNTHESIS.model}${
    OVERRIDES ? " (overridden by EVAL_MODEL)" : ""
  }`
);

async function runCase(
  testCase: GenerationCase,
  catalog: NodeType[]
): Promise<CaseResult> {
  let attempts = 0;

  const result = await runGenerationPipeline({
    prompt: testCase.prompt,
    nodeTypes: catalog,
    connectedProviders: new Set([
      "slack",
      "discord",
      "telegram",
      "whatsapp",
      "google-mail",
      "github",
    ]),
    orgResources: ORG_RESOURCES,
    // Literally the function the Durable Object dispatches through, not a copy
    // of it — same tier, same output ceiling, same constrained decoding. A
    // benchmark that dispatches its own way measures a path that does not ship,
    // and the copy this replaced had already drifted: it pinned the workflow
    // schema unconditionally.
    callLLM: (call: GenerateCall) => {
      attempts++;
      return ROUTE(call);
    },
    // Frames are the browser's channel; the trace is the pipeline's. This used
    // to scrape both the first-attempt verdict and the final graph out of the
    // UI stream, which is how a measurement harness came to depend on a
    // rendering contract.
    emit: () => {},
    // Saving and running are out of scope here: this measures whether a valid
    // graph comes out, not whether Workers AI is up.
    save: async () => "benchmark-workflow",
    run: async () =>
      ({
        id: "benchmark-execution",
        workflowId: "benchmark-workflow",
        status: "completed",
        nodeExecutions: [],
      }) as never,
  });

  const trace = result.trace;
  const finalWorkflow: Workflow | undefined = result.workflow;

  // The first attempt's verdict, read off the trace rather than off a frame.
  const firstValidation = trace.find(
    (entry) => entry.stage === "validate" && entry.attempt === 0
  );

  const validAfterRepair = result.outcome !== "failed";
  const structural = finalWorkflow
    ? findStructuralProblems(finalWorkflow.nodes, finalWorkflow.edges)
    : ["no graph produced"];
  const validationErrors = finalWorkflow
    ? validateWorkflow(finalWorkflow, catalog)
    : [];

  return {
    id: testCase.id,
    // No graph is a failure of every condition at once, and reporting each one
    // separately would triple-count a single failure in the aggregate.
    unmet: finalWorkflow ? unmetConditions(finalWorkflow, testCase) : [],
    validFirstTry: firstValidation?.ok === true,
    validAfterRepair:
      validAfterRepair &&
      structural.length === 0 &&
      validationErrors.length === 0,
    triggerCorrect: finalWorkflow?.trigger === testCase.expectTrigger,
    repairs: Math.max(0, attempts - 1),
    error: structural[0] ?? validationErrors[0]?.message,
    stage: firstFailure(trace)?.stage,
    trace,
  };
}

describe("workflow generator benchmark", () => {
  const results: CaseResult[] = [];

  for (const testCase of CASES) {
    it(`generates a valid workflow for "${testCase.id}"`, async () => {
      const result = await runCase(testCase, CATALOG);
      results.push(result);

      // The stages, when something went wrong. A per-case assertion message
      // says what broke; this says where, which is the difference between a
      // red suite and a diagnosis.
      if (
        !result.validAfterRepair ||
        !result.triggerCorrect ||
        result.unmet.length > 0
      ) {
        console.log(`\n[benchmark] ${testCase.id} stages:`);
        for (const entry of result.trace) {
          console.log(`  ${entry.ok ? " " : "!"} ${summarize(entry)}`);
        }
      }

      // Per-case assertions stop regressions; the aggregate below is the
      // number worth watching.
      expect(
        result.validAfterRepair,
        `${testCase.id}: ${result.error ?? "unknown failure"}`
      ).toBe(true);
      expect(
        result.triggerCorrect,
        `${testCase.id}: expected trigger ${testCase.expectTrigger}`
      ).toBe(true);
      // Last, because a valid graph with the right trigger that still does not
      // do the job is the failure the other two assertions cannot see.
      expect(
        result.unmet,
        `${testCase.id}: ${result.unmet.join("; ")}`
      ).toEqual([]);
    }, 180_000);
  }

  it("reports the aggregate pass rate", () => {
    const total = results.length;
    if (total === 0) return;

    const firstTry = results.filter((r) => r.validFirstTry).length;
    const afterRepair = results.filter((r) => r.validAfterRepair).length;
    const triggers = results.filter((r) => r.triggerCorrect).length;
    const meanRepairs = results.reduce((sum, r) => sum + r.repairs, 0) / total;

    // Counted over the cases that set conditions, not over all of them: a rate
    // diluted by cases with nothing to check moves when cases are added and
    // says nothing about the generator.
    const conditioned = results.filter((r) =>
      CASES.some(
        (testCase) =>
          testCase.id === r.id &&
          ((testCase.requires?.length ?? 0) > 0 ||
            (testCase.binds?.length ?? 0) > 0)
      )
    );
    const satisfied = conditioned.filter((r) => r.unmet.length === 0).length;

    console.log(
      // The model that actually answered, not the one configured — a sweep
      // whose report names the wrong model is worse than no report.
      `\n[benchmark] model=${SYNTHESIS.provider}:${SYNTHESIS.model}\n` +
        `  ${firstTry}/${total} valid on first attempt\n` +
        `  ${afterRepair}/${total} valid after repair\n` +
        `  ${triggers}/${total} correct trigger\n` +
        `  ${satisfied}/${conditioned.length} met every condition\n` +
        `  ${meanRepairs.toFixed(2)} mean repairs\n`
    );

    for (const result of results.filter((r) => r.unmet.length > 0)) {
      console.log(`  UNMET ${result.id}: ${result.unmet.join("; ")}`);
    }

    const byStage = new Map<string, number>();
    for (const result of results.filter((r) => !r.validAfterRepair)) {
      const stage = result.stage ?? "content";
      byStage.set(stage, (byStage.get(stage) ?? 0) + 1);
    }
    for (const [stage, count] of [...byStage].sort((a, b) => b[1] - a[1])) {
      console.log(`  broke at ${stage}: ${count}`);
    }

    for (const result of results.filter((r) => !r.validAfterRepair)) {
      console.log(
        `  FAILED ${result.id} [${result.stage ?? "content"}]: ${result.error}`
      );
    }
  });
});
