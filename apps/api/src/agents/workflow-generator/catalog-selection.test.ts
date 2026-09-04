import type { NodeType } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { workflowTemplates } from "../../templates";
import { pseudoNodeTypes } from "./ai-nodes";
import { selectCandidates } from "./catalog-selection";
import { filterEligible } from "./eligibility";
import type { Requirement } from "./eval/benchmark-cases";
import { BENCHMARK_CASES, COVERAGE_CASES } from "./eval/benchmark-cases";
import {
  CONNECTED_PROVIDERS,
  DEPLOYMENT_CATALOG,
  OFFERABLE_RESOURCES,
} from "./eval/deployment";
import { EVALUATION_CASES } from "./eval/evaluation-cases";
import { templateToEmitFormat } from "./template-examples";

/**
 * Can the model even see the nodes it would need?
 *
 * The one stage of the pipeline that is fully deterministic — no model call, no
 * network — and therefore the one that can be asserted on every real request in
 * the suite CI runs. Everything downstream is measured against a graph this
 * stage already bounded: a type absent from the catalog is a type the generator
 * cannot use however well it reasons, and the failure surfaces three stages
 * later as a repair round chasing an invented type, or as a workflow built out
 * of something that does not fit.
 *
 * The expectation is derived rather than written down. Each benchmark case
 * names a shipped template, the templates are the only hand-verified graphs in
 * the codebase, and a template is by construction a correct answer to its own
 * prompt — so "every node type this template is built from is offered for this
 * prompt" is an assertion that maintains itself as the templates change.
 *
 * This is the real catalog, not `fixtures.ts`. Ranking against a dozen fixture
 * types and ranking against four hundred registrations are different problems,
 * and only the second one ships.
 */

/**
 * The catalog, the accounts and the owned resources all come from
 * `deployment.ts`, so this gate and the benchmark it predicts rank the same
 * platform. Aliased locally because every assertion below reads better naming
 * the catalog than the deployment.
 */
const CATALOG: NodeType[] = DEPLOYMENT_CATALOG;
const CONNECTED = CONNECTED_PROVIDERS;

const BY_TYPE = new Map(CATALOG.map((nodeType) => [nodeType.type, nodeType]));

/** The server injects these, so they are never offered and never missing. */
function isInjected(type: string): boolean {
  const nodeType = BY_TYPE.get(type);
  return Boolean(nodeType?.trigger || nodeType?.responder);
}

/**
 * Everything eligibility permits, which is the pool retrieval draws from.
 *
 * The distinction this test turns on. A template node can be absent from the
 * catalog for two unrelated reasons, and only one of them is a defect:
 *
 * - Policy withheld it. `cloudflare-model` is replaced by the curated stand-ins,
 *   the Workers AI agents were dropped for one that stops when it is done,
 *   thirty AI models are unoffered so the choice is a decision rather than a
 *   lottery. Every one of those is deliberate, documented, and has a named
 *   replacement — asserting on them would be asserting the policy is wrong.
 * - Retrieval missed it. The node is eligible, the request needs it, and the
 *   keyword ranker did not surface it inside the cap. That is the failure worth
 *   gating, and it is invisible until the two cases are separated.
 */
const ELIGIBLE = filterEligible([...CATALOG, ...pseudoNodeTypes()], {
  connectedProviders: CONNECTED,
}).byType;

/**
 * Retrieval misses that exist today, recorded rather than hidden.
 *
 * Pinned to the exact set so the gate still does its job: a new miss fails the
 * suite, and fixing one of these fails it too rather than rotting into a
 * permanent exception. Neither is a scoring bug — both are the candidate cap
 * biting on a long prompt, where the tokens that matter are outnumbered.
 *
 * They are left rather than fixed because changing retrieval changes which
 * nodes every request gets offered, and that is a quality change wanting
 * measurement rather than a guess — the pipeline trace is what will settle it.
 *
 * `image-to-text` is the one that actually costs a capability: the offered TTS
 * node is the only one there is, so a request whose last step is speech cannot
 * be built at all when it drops. `image-processing` costs nothing — the
 * template's exact photon node is one of many that would apply a colour
 * effect, and `image-input` covers `webcam-input`.
 */
const KNOWN_RETRIEVAL_GAPS: Record<string, string[]> = {
  "image-processing": ["webcam-input", "photon-adjust-contrast"],
  "image-to-text": ["gemini-2-5-flash-tts"],
};

/**
 * Capabilities a coverage case needs that nothing offered can supply.
 *
 * Pinned to the exact list, as the retrieval gaps are, so the gate keeps
 * working in both directions. Unlike those, this is not the cap biting: the
 * two nodes that can generate a video are withheld by policy — one replaced by
 * the curated stand-ins, the other an unoffered AI type — and neither
 * withholding is reported as relevant, so a person asking for a video is
 * handed a graph built from an image model and told nothing. Closing it means
 * offering a stand-in for video generation; this entry goes when that lands.
 */
const KNOWN_CAPABILITY_GAPS: Record<string, string[]> = {
  "ai-video": ["make a video"],
};

describe("the catalog offers what a correct answer needs", () => {
  for (const testCase of BENCHMARK_CASES) {
    it(`offers the node types "${testCase.templateId}" is built from`, () => {
      const template = workflowTemplates.find(
        (entry) => entry.id === testCase.templateId
      );
      if (!template) {
        throw new Error(`No template "${testCase.templateId}"`);
      }

      // Projected first: templates pin `cloudflare-model`, and the projection
      // is what the prompt's own few-shot examples are built from — so it is
      // the shape the generator is actually being taught to emit.
      const needed = [
        ...new Set(
          templateToEmitFormat(template)
            .nodes.map((node) => node.type)
            .filter((type) => !isInjected(type) && ELIGIBLE.has(type))
        ),
      ];

      const { candidates } = selectCandidates(testCase.prompt, CATALOG, {
        connectedProviders: CONNECTED,
      });
      const offered = new Set(candidates.map((candidate) => candidate.type));

      expect(
        needed.filter((type) => !offered.has(type)).sort(),
        `"${testCase.prompt}" — these are eligible, the shipped template is built from them, and retrieval did not surface them`
      ).toEqual([...(KNOWN_RETRIEVAL_GAPS[testCase.templateId] ?? [])].sort());
    });
  }
});

/**
 * The capabilities nothing offered can supply.
 *
 * A requirement met only by a responder counts as met: the server injects
 * those rather than letting the model choose them, so their absence from the
 * catalog is by design and not a gap.
 */
function unmetBy(
  offered: ReadonlySet<string>,
  requirements: readonly Requirement[] = []
): string[] {
  return requirements
    .filter(
      (requirement) =>
        !requirement.anyOf.some((type) => offered.has(type) || isInjected(type))
    )
    .map((requirement) => requirement.capability);
}

/**
 * The coverage cases have no template either, but each states what its graph
 * cannot do without — and the benchmark only checks that against the graph
 * that came out, three billed stages after the answer was decided. Asked here
 * of the catalog: is at least one node per requirement on the table?
 *
 * The check the two typed sentences at the end of `COVERAGE_CASES` were added
 * for. One of them fails here for a reason no model call could fix.
 */
describe("the catalog offers every capability a coverage case requires", () => {
  for (const testCase of COVERAGE_CASES) {
    const requirements = testCase.requires ?? [];
    if (requirements.length === 0) continue;

    it(`offers what "${testCase.id}" cannot be built without`, () => {
      const { candidates } = selectCandidates(testCase.prompt, CATALOG, {
        connectedProviders: CONNECTED,
        offerable: OFFERABLE_RESOURCES,
      });
      const offered = new Set(candidates.map((candidate) => candidate.type));

      expect(
        unmetBy(offered, requirements),
        `"${testCase.prompt}" — the case needs these and retrieval offered nothing that does them`
      ).toEqual(KNOWN_CAPABILITY_GAPS[testCase.id] ?? []);
    });
  }
});

/**
 * The evaluation cases have no template to derive from — they exist precisely
 * because they are not template-shaped. What they share is a floor: every one
 * asks for something to be produced and shown, so a text generator and a way to
 * deliver it have to be on the table or the case cannot pass for reasons that
 * have nothing to do with the model.
 */
describe("the catalog floor holds for every evaluation case", () => {
  for (const testCase of EVALUATION_CASES) {
    it(`offers a generator and an output for "${testCase.id}"`, () => {
      // Nothing connected, matching the tier these cases run in.
      const { candidates } = selectCandidates(testCase.prompt, CATALOG, {
        connectedProviders: new Set(),
      });
      const offered = new Set(candidates.map((candidate) => candidate.type));

      expect(offered.has("agent-claude-opus-5")).toBe(true);
      expect(offered.has("output-text")).toBe(true);

      // And the destination, for the cases that name one. The evaluation tier
      // judges delivered text and cannot tell an emailed digest from one left
      // in a widget, so the promise is held here instead.
      expect(unmetBy(offered, testCase.requires)).toEqual([]);
    });
  }
});

describe("selection stays within its budget", () => {
  it("never offers more than the cap plus the guaranteed core", () => {
    // The prompt carries every candidate's ports, so an unbounded catalog is an
    // unbounded system prompt — and the cap is what keeps a generation's input
    // cost predictable.
    for (const testCase of BENCHMARK_CASES) {
      const { candidates } = selectCandidates(testCase.prompt, CATALOG, {
        connectedProviders: CONNECTED,
      });
      expect(candidates.length).toBeLessThanOrEqual(100);
    }
  });
});

describe("dynamic pseudo-node descriptions", () => {
  it("appends the live catalog's words to the hand-written line", () => {
    const [image] = pseudoNodeTypes([
      {
        id: "uuid-1",
        name: "@cf/black-forest-labs/flux-1-schnell",
        description: "A 12 billion parameter rectified flow transformer.",
        task: { id: "t", name: "Text-to-Image" },
      },
    ]);

    expect(image.type).toBe("ai-image");
    expect(image.description).toContain(
      "Generate an image from a text description."
    );
    expect(image.description).toContain("rectified flow transformer");
  });

  it("stands on the hand-written text when the catalog is absent or silent", () => {
    const withoutCatalog = pseudoNodeTypes();
    const withUnrelated = pseudoNodeTypes([
      { id: "uuid-2", name: "@cf/some/other-model", description: "Other." },
    ]);

    expect(withoutCatalog[0].description).toBe(
      "Generate an image from a text description."
    );
    expect(withUnrelated[0].description).toBe(withoutCatalog[0].description);
  });
});
