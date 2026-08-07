import { env } from "cloudflare:test";
import type { NodeType, Workflow, WorkflowExecution } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { callAgentLLM } from "../../durable-objects/agent-llm";
import { CloudflareNodeRegistry } from "../../runtime/cloudflare-node-registry";
import { WorkflowExecutor } from "../../services/workflow-executor";
import { GENERATOR_MAX_TOKENS, GENERATOR_MODELS } from "./config";
import type { EvaluationCase } from "./evaluation-cases";
import { EVALUATION_CASES } from "./evaluation-cases";
import type { OutputProblem } from "./output-checks";
import { checkDelivered, deliveredText } from "./output-checks";
import type { GenerateCall } from "./pipeline";
import { runGenerationPipeline } from "./pipeline";
import { DRAFT_SCHEMA } from "./prompts";

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
 */

const bindings = env as unknown as Bindings;

const CATALOG: NodeType[] = new CloudflareNodeRegistry(
  bindings,
  false
).getNodeTypes();

/** Delivered as a binding, since `process.env` does not cross into workerd. */
interface EvalEnv {
  EVAL_RUNS?: string;
}

const RUNS = Number((env as unknown as EvalEnv).EVAL_RUNS ?? "1");

// Announced before the first model call rather than only in the closing
// summary. `EVAL_RUNS` reaches the pool as a binding, and when that breaks it
// does not fail — it quietly reads 1, which is indistinguishable from a run
// that was meant to be single-sample until the bill arrives.
console.log(`[eval] ${RUNS} sample(s) per case`);

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
}

/** Node types in graph order. Empty when generation never produced a graph. */
function nodeTypesOf(workflow: Workflow | undefined): string[] {
  return workflow?.nodes.map((node) => node.type) ?? [];
}

async function runSample(testCase: EvaluationCase): Promise<Sample> {
  let finalWorkflow: Workflow | undefined;
  let execution: WorkflowExecution | undefined;

  try {
    const result = await runGenerationPipeline({
      prompt: testCase.prompt,
      nodeTypes: CATALOG,
      // Nothing linked: the eval must not depend on which accounts happen to be
      // connected to whatever workspace it runs against.
      connectedProviders: new Set<string>(),
      callLLM: async (call: GenerateCall) => {
        const tierName = call.tier ?? "synthesis";
        const tier = GENERATOR_MODELS[tierName];
        const response = await callAgentLLM(bindings, {
          provider: tier.provider,
          model: tier.model,
          maxTokens: GENERATOR_MAX_TOKENS[tierName],
          instructions: call.system,
          messages: call.messages,
          tools: [],
          schema:
            call.schema ?? (DRAFT_SCHEMA as unknown as Record<string, unknown>),
        });
        return {
          content: response.content ?? "",
          inputTokens: response.inputTokens ?? 0,
          outputTokens: response.outputTokens ?? 0,
        };
      },
      emit: (frame) => {
        if (frame.type === "graph") finalWorkflow = frame.workflow;
      },
      save: async () => "eval-workflow",
      // The real executor, because the whole point is what the nodes produce.
      // Approval is deliberately not wired: with no provider connected there is
      // nothing outward to approve, and a harness that could post would be a
      // harness nobody dares run.
      run: async (workflow, workflowId, parameters, inputOverrides) => {
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
          env: bindings,
        });
        execution = outcome.execution;
        return outcome.execution;
      },
    });

    if (!finalWorkflow || result.outcome === "failed") {
      return {
        caseId: testCase.id,
        built: false,
        ran: false,
        clean: false,
        problems: [],
        delivered: [],
        nodeTypes: nodeTypesOf(finalWorkflow),
        outcome: result.outcome,
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
        nodeTypes: nodeTypesOf(finalWorkflow),
        outcome: result.outcome,
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
      nodeTypes: nodeTypesOf(finalWorkflow),
      outcome: result.outcome,
    };
  } catch (error) {
    return {
      caseId: testCase.id,
      built: Boolean(finalWorkflow),
      ran: false,
      clean: false,
      problems: [],
      delivered: [],
      nodeTypes: nodeTypesOf(finalWorkflow),
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
      `outcome=${sample.outcome ?? "?"} nodes=${sample.nodeTypes.length})`
  );
  if (sample.nodeTypes.length) {
    console.log(`  types: ${sample.nodeTypes.join(", ")}`);
  }
  if (sample.error) console.log(`  error: ${sample.error}`);
  for (const problem of sample.problems) {
    console.log(`  ${problem.code}: ${problem.message}`);
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

    const report = [
      `model=${GENERATOR_MODELS.synthesis.model} runs=${RUNS}`,
      `  ${built}/${total} built a valid graph`,
      `  ${ran}/${total} ran to completion`,
      `  ${clean}/${total} delivered something usable`,
      // The gap between the second and third numbers is the whole reason this
      // suite exists: everything in it passes the benchmark.
      `  ${ran - clean}/${total} ran cleanly but delivered something wrong`,
      ...[...byCode]
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => `  ${code}: ${count}`),
      ...samples
        .filter((sample) => !sample.clean)
        .map(
          (sample) =>
            `  ${sample.caseId}: ${
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
