import { env } from "cloudflare:test";
import type { BriefDestination } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../../context";
import { generateBrief } from "../brief";
import type { GroundingContext } from "../grounding";
import { createModelRouter } from "../model-router";
import type { Workspace } from "../workspace";
import { createWorkspace } from "../workspace";
import { briefViolations } from "./brief-assertions";
import { BRIEF_BENCHMARK_CASES } from "./brief-benchmark-cases";

/**
 * Does the brief surface every moving part? — the regression gate for
 * systematic identification, measured as a rate rather than a coin flip.
 *
 * Before this suite, "the schedule hour is always tappable" was prompt prose;
 * `normalizeBrief` guarantees structure but cannot conjure a slot the model
 * never emitted. So this makes real fast-tier calls against requests whose
 * moving parts are known, and reads what the sentences carry.
 *
 * Per sample only the code-backed guarantee is asserted: a brief comes back.
 * Checklist compliance is stochastic — the same request surfaces its
 * criterion on one run and not the next, which is the very inconsistency the
 * prompt works against — so it is gated in aggregate: the clean-sample rate
 * must hold the floor, and the per-case report is what to read when pushing
 * it up.
 *
 *   pnpm --filter '@dafthunk/api' test:integration
 *
 * `EVAL_RUNS` sets samples per case (default 1). Generation is stochastic —
 * raise it to measure a prompt change, and expect the cost to rise with it.
 */

const bindings = env as unknown as Bindings;

const RUNS = Number(
  (env as unknown as { EVAL_RUNS?: string }).EVAL_RUNS ?? "1"
);

const callLLM = createModelRouter(bindings);

/** A fixed destination set, so destination expectations mean one thing. */
const DESTINATIONS: BriefDestination[] = [
  {
    id: "email",
    kind: "email",
    label: "email it to you",
    nodeTypes: ["send-email"],
  },
  {
    id: "discord",
    kind: "integration",
    provider: "discord",
    label: "post it to Discord",
    nodeTypes: ["send-message-discord"],
  },
  {
    id: "display",
    kind: "display",
    label: "show it to you here",
    nodeTypes: ["output-text"],
  },
];

/** A fixture workspace: two datasets, a mailbox, one database. */
const GROUNDING: GroundingContext = {
  families: [
    {
      family: "database",
      noun: "database",
      purpose:
        "A set of SQL tables the workspace owns, persisted between runs; workflows read and write it through database nodes.",
      creatable: true,
      instances: [
        {
          id: "db-main",
          name: "main",
          description: "The workspace's main application data",
        },
      ],
      triggerKinds: [],
    },
    {
      family: "dataset",
      noun: "dataset",
      purpose:
        "A collection of documents the workspace owns; workflows search it and read files from it.",
      creatable: true,
      instances: [
        {
          id: "ds-docs",
          name: "Product docs",
          description: "Indexed product documentation",
        },
        { id: "ds-kb", name: "Support KB" },
      ],
      triggerKinds: [],
    },
    {
      family: "email",
      noun: "mailbox",
      purpose:
        "A mailbox with its own address on the platform's mail domain; incoming mail can start workflows.",
      creatable: true,
      instances: [
        {
          id: "em-support",
          name: "support",
          address: "support-x9@mail.example.com",
        },
      ],
      triggerKinds: ["email_message"],
    },
  ],
  aiModels:
    "Text, image, transcription, speech and vision models that run inside nodes; no extra account is needed.",
};

/**
 * The two fixtures above, as the workspace the brief is held to.
 *
 * Stated rather than derived: a benchmark whose destination set moves with the
 * registry measures two things at once, and the expectations in the case file
 * are written against exactly these three destinations.
 */
const BENCH_WORKSPACE: Workspace = {
  ...createWorkspace({
    nodeTypes: [],
    connectedProviders: new Set(["discord"]),
  }),
  grounding: GROUNDING,
  destinations: () => DESTINATIONS,
};

interface Sample {
  caseId: string;
  run: number;
  ok: boolean;
  violations: string[];
  briefMillis: number;
}

const samples: Sample[] = [];

/**
 * The floor the clean rate must hold. Measured at 4/6 on the first sweep;
 * the gate exists to catch a prompt change that sends it broadly backwards,
 * and the report above it is what to read when raising it.
 */
const MIN_CLEAN_RATE = 0.6;

describe("the brief surfaces every known moving part", () => {
  for (const testCase of BRIEF_BENCHMARK_CASES) {
    for (let run = 0; run < RUNS; run++) {
      it(`${testCase.id}${RUNS > 1 ? ` #${run + 1}` : ""}`, async () => {
        const started = Date.now();
        const outcome = await generateBrief({
          request: testCase.prompt,
          workspace: BENCH_WORKSPACE,
          callLLM,
        });
        const briefMillis = Date.now() - started;

        // The code-backed guarantee: whatever the model did, a brief exists.
        expect(outcome.kind).toBe("brief");
        if (outcome.kind !== "brief") return;

        const violations = briefViolations(outcome.brief, testCase);
        samples.push({
          caseId: testCase.id,
          run,
          ok: violations.length === 0,
          violations,
          briefMillis,
        });
      });
    }
  }

  it("holds the clean-rate floor, and reports the misses", () => {
    const passed = samples.filter((sample) => sample.ok).length;
    const slowest = Math.max(0, ...samples.map((s) => s.briefMillis));
    console.log(
      `[brief-benchmark] ${passed}/${samples.length} samples clean; slowest brief ${slowest}ms`
    );
    for (const sample of samples.filter((s) => !s.ok)) {
      console.log(
        `[brief-benchmark] ${sample.caseId}#${sample.run}: ${sample.violations.join("; ")}`
      );
    }

    expect(samples.length).toBeGreaterThan(0);
    expect(passed / samples.length).toBeGreaterThanOrEqual(MIN_CLEAN_RATE);
  });
});
