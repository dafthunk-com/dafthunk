import { env } from "cloudflare:test";
import { validateWorkflow } from "@dafthunk/runtime";
import type { NodeType, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { callAgentLLM } from "../../durable-objects/agent-llm";
import { CloudflareNodeRegistry } from "../../runtime/cloudflare-node-registry";
import { findStructuralProblems } from "../../templates/template-test-utils";
import type { BenchmarkCase } from "./benchmark-cases";
import { BENCHMARK_CASES } from "./benchmark-cases";
import { GENERATOR_MODEL, GENERATOR_PROVIDER } from "./config";
import type { GenerateCall } from "./pipeline";
import { runGenerationPipeline } from "./pipeline";
import { DRAFT_SCHEMA } from "./prompts";

/**
 * Quality gauge for the generator, measured against the 23 shipped templates.
 *
 * This makes real, billed model calls, which is why it lives in the integration
 * tier and is not run by CI. It reports a pass rate rather than asserting
 * 23/23 — the number is the thing to optimize, and it is also how the choice of
 * model gets settled: run it on two tiers and compare rate against cost.
 *
 *   pnpm --filter '@dafthunk/api' benchmark:generate
 */

interface CaseResult {
  templateId: string;
  validFirstTry: boolean;
  validAfterRepair: boolean;
  triggerCorrect: boolean;
  repairs: number;
  error?: string;
}

const bindings = env as unknown as Bindings;

// Built once: the registry runs ~476 registrations, and rebuilding it per case
// measures nothing.
const CATALOG: NodeType[] = new CloudflareNodeRegistry(
  bindings,
  false
).getNodeTypes();

async function runCase(
  testCase: BenchmarkCase,
  catalog: NodeType[]
): Promise<CaseResult> {
  let attempts = 0;
  let firstAttemptClean: boolean | null = null;
  let finalWorkflow: Workflow | undefined;

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
    callLLM: async (call: GenerateCall) => {
      attempts++;
      const response = await callAgentLLM(bindings, {
        provider: GENERATOR_PROVIDER,
        model: GENERATOR_MODEL,
        instructions: call.system,
        messages: call.messages,
        tools: [],
        schema: DRAFT_SCHEMA as unknown as Record<string, unknown>,
      });
      return {
        content: response.content ?? "",
        inputTokens: response.inputTokens ?? 0,
        outputTokens: response.outputTokens ?? 0,
      };
    },
    emit: (frame) => {
      if (frame.type === "validation" && frame.attempt === 0) {
        firstAttemptClean = frame.issues.every((i) => i.severity !== "fatal");
      }
      if (frame.type === "graph") finalWorkflow = frame.workflow;
    },
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

  const validAfterRepair = result.outcome !== "failed";
  const structural = finalWorkflow
    ? findStructuralProblems(finalWorkflow.nodes, finalWorkflow.edges)
    : ["no graph produced"];
  const validationErrors = finalWorkflow
    ? validateWorkflow(finalWorkflow, catalog)
    : [];

  return {
    templateId: testCase.templateId,
    validFirstTry: firstAttemptClean === true,
    validAfterRepair:
      validAfterRepair &&
      structural.length === 0 &&
      validationErrors.length === 0,
    triggerCorrect: finalWorkflow?.trigger === testCase.expectTrigger,
    repairs: Math.max(0, attempts - 1),
    error: structural[0] ?? validationErrors[0]?.message,
  };
}

describe("workflow generator benchmark", () => {
  const results: CaseResult[] = [];

  for (const testCase of BENCHMARK_CASES) {
    it(`generates a valid workflow for "${testCase.templateId}"`, async () => {
      const result = await runCase(testCase, CATALOG);
      results.push(result);

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
      `\n[benchmark] model=${GENERATOR_MODEL}\n` +
        `  ${firstTry}/${total} valid on first attempt\n` +
        `  ${afterRepair}/${total} valid after repair\n` +
        `  ${triggers}/${total} correct trigger\n` +
        `  ${meanRepairs.toFixed(2)} mean repairs\n`
    );

    for (const result of results.filter((r) => !r.validAfterRepair)) {
      console.log(`  FAILED ${result.templateId}: ${result.error}`);
    }
  });
});
