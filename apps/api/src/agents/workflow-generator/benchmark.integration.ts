import { env } from "cloudflare:test";
import { validateWorkflow } from "@dafthunk/runtime";
import type { NodeType, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { CloudflareNodeRegistry } from "../../runtime/cloudflare-node-registry";
import { findStructuralProblems } from "../../templates/template-test-utils";
import type { BenchmarkCase } from "./benchmark-cases";
import { BENCHMARK_CASES } from "./benchmark-cases";
import {
  createModelRouter,
  parseModelOverride,
  resolveTier,
} from "./model-router";
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

interface CaseResult {
  templateId: string;
  validFirstTry: boolean;
  validAfterRepair: boolean;
  triggerCorrect: boolean;
  repairs: number;
  error?: string;
  /** The first stage that did not do its job, for a failure worth attributing. */
  stage?: string;
  /** Every stage, printed when a case fails. */
  trace: TraceEntry[];
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
  testCase: BenchmarkCase,
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
    templateId: testCase.templateId,
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

  for (const testCase of BENCHMARK_CASES) {
    it(`generates a valid workflow for "${testCase.templateId}"`, async () => {
      const result = await runCase(testCase, CATALOG);
      results.push(result);

      // The stages, when something went wrong. A per-case assertion message
      // says what broke; this says where, which is the difference between a
      // red suite and a diagnosis.
      if (!result.validAfterRepair || !result.triggerCorrect) {
        console.log(`\n[benchmark] ${testCase.templateId} stages:`);
        for (const entry of result.trace) {
          console.log(`  ${entry.ok ? " " : "!"} ${summarize(entry)}`);
        }
      }

      // Per-case assertions stop regressions; the aggregate below is the
      // number worth watching.
      expect(
        result.validAfterRepair,
        `${testCase.templateId}: ${result.error ?? "unknown failure"}`
      ).toBe(true);
      expect(
        result.triggerCorrect,
        `${testCase.templateId}: expected trigger ${testCase.expectTrigger}`
      ).toBe(true);
    }, 180_000);
  }

  it("reports the aggregate pass rate", () => {
    const total = results.length;
    if (total === 0) return;

    const firstTry = results.filter((r) => r.validFirstTry).length;
    const afterRepair = results.filter((r) => r.validAfterRepair).length;
    const triggers = results.filter((r) => r.triggerCorrect).length;
    const meanRepairs = results.reduce((sum, r) => sum + r.repairs, 0) / total;

    console.log(
      // The model that actually answered, not the one configured — a sweep
      // whose report names the wrong model is worse than no report.
      `\n[benchmark] model=${SYNTHESIS.provider}:${SYNTHESIS.model}\n` +
        `  ${firstTry}/${total} valid on first attempt\n` +
        `  ${afterRepair}/${total} valid after repair\n` +
        `  ${triggers}/${total} correct trigger\n` +
        `  ${meanRepairs.toFixed(2)} mean repairs\n`
    );

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
        `  FAILED ${result.templateId} [${result.stage ?? "content"}]: ${result.error}`
      );
    }
  });
});
