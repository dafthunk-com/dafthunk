import type { BriefDestination } from "@dafthunk/types";
import { renderBriefSentence } from "@dafthunk/utils";
import { describe, expect, it, vi } from "vitest";

import {
  briefSuggestions,
  generateBrief,
  missingBriefRoles,
  normalizeBrief,
} from "./brief";
import { briefViolations } from "./brief-assertions";
import { MAX_ASKED_BLANKS } from "./config";
import type { GroundingContext } from "./grounding";
import type { GenerateCall, GenerateResult } from "./pipeline";

const EMAIL: BriefDestination = {
  id: "email",
  kind: "email",
  label: "email it to you",
  nodeTypes: ["send-email"],
};
const DISPLAY: BriefDestination = {
  id: "display",
  kind: "display",
  label: "show it to you here",
  nodeTypes: ["output-text"],
};
const DESTINATIONS = [EMAIL, DISPLAY];

function blank(
  id: string,
  weight: number,
  extra: Record<string, unknown> = {}
) {
  return {
    id,
    type: "choice",
    question: "Which one?",
    assumed: "a",
    weight,
    role: "detail",
    options: [
      { id: "a", label: `${id}-a` },
      { id: "b", label: `${id}-b` },
    ],
    ...extra,
  };
}

function rawBrief(overrides: Record<string, unknown> = {}) {
  return {
    title: "Triage support email",
    segments: [
      { kind: "text", text: "Sort my support email and " },
      { kind: "slot", blankId: "dest" },
      { kind: "text", text: "." },
    ],
    blanks: [
      blank("dest", 1, {
        role: "destination",
        assumed: "email",
        options: [
          { id: "email", label: "email it to you" },
          { id: "display", label: "show it to you here" },
        ],
      }),
    ],
    destinationId: "email",
    trigger: "manual",
    ...overrides,
  };
}

const context = {
  request: "sort my support email",
  destinations: DESTINATIONS,
};

/** A brief carrying every guaranteed slot, so enforcement has nothing to add. */
function completeRawBrief() {
  return rawBrief({
    segments: [
      { kind: "slot", blankId: "when" },
      { kind: "text", text: ", sort my support email and " },
      { kind: "slot", blankId: "dest" },
      { kind: "text", text: "." },
    ],
    blanks: [
      ...(rawBrief().blanks as unknown[]),
      blank("when", 0.2, {
        role: "trigger",
        assumed: "manual",
        options: [
          { id: "manual", label: "When you run this", triggerValue: "manual" },
          {
            id: "morning",
            label: "Every morning at 8",
            triggerValue: "scheduled",
          },
        ],
      }),
    ],
  });
}

describe("normalizeBrief", () => {
  it("keeps a well-formed brief intact", () => {
    const brief = normalizeBrief(rawBrief(), context);

    expect(brief?.blanks).toHaveLength(1);
    expect(renderBriefSentence(brief!)).toBe(
      "Sort my support email and email it to you."
    );
  });

  it("enforces the question budget by demoting, not destroying", () => {
    // The prompt asks for two questions. The budget is not a request — but it
    // limits questions, not affordances: the blanks beyond it stay in the
    // sentence as quiet, tappable slots instead of collapsing into prose.
    const brief = normalizeBrief(
      rawBrief({
        segments: [
          { kind: "text", text: "Do " },
          { kind: "slot", blankId: "b1" },
          { kind: "text", text: " and " },
          { kind: "slot", blankId: "b2" },
          { kind: "text", text: " and " },
          { kind: "slot", blankId: "b3" },
          { kind: "text", text: " and " },
          { kind: "slot", blankId: "b4" },
          { kind: "text", text: "." },
        ],
        blanks: [
          blank("b1", 0.2),
          blank("b2", 0.9),
          blank("b3", 0.5),
          blank("b4", 0.1),
        ],
      }),
      context
    );

    const asked = brief!.blanks.filter((entry) => entry.asked !== false);
    const quiet = brief!.blanks.filter((entry) => entry.asked === false);

    expect(asked).toHaveLength(MAX_ASKED_BLANKS);
    // Ranked by impact, not by the order the model happened to emit.
    expect(asked.map((entry) => entry.id)).toEqual(["b2", "b3"]);
    // The evicted blanks survive, demoted — still moving parts, no longer
    // questions.
    expect(quiet.map((entry) => entry.id)).toEqual(["b1", "b4"]);
    // Every slot still renders as a slot; nothing collapsed into prose.
    expect(renderBriefSentence(brief!)).toBe(
      "Do b1-a and b2-a and b3-a and b4-a."
    );
  });

  it("turns a blank past the total cap into the words it was going to read as", () => {
    // Beyond MAX_TOTAL_BLANKS the old collapse returns: a sentence that is all
    // slots is as illegible as one with none. The lowest-weight blank is
    // decided rather than missing — the sentence still says what will happen.
    const ids = ["b1", "b2", "b3", "b4", "b5", "b6", "b7"];
    const brief = normalizeBrief(
      rawBrief({
        segments: [
          { kind: "text", text: "Do " },
          ...ids.flatMap((id, index) => [
            ...(index > 0 ? [{ kind: "text", text: " and " }] : []),
            { kind: "slot", blankId: id },
          ]),
          { kind: "text", text: "." },
        ],
        blanks: ids.map((id, index) => blank(id, 0.9 - index * 0.1)),
      }),
      context
    );

    expect(brief?.blanks.map((entry) => entry.id)).toEqual([
      "b1",
      "b2",
      "b3",
      "b4",
      "b5",
      "b6",
    ]);
    expect(renderBriefSentence(brief!)).toBe(
      "Do b1-a and b2-a and b3-a and b4-a and b5-a and b6-a and b7-a."
    );
  });

  it("keeps the destination blank asked and outside the budget", () => {
    const brief = normalizeBrief(
      rawBrief({
        segments: [
          { kind: "slot", blankId: "dest" },
          { kind: "text", text: " after " },
          { kind: "slot", blankId: "b1" },
          { kind: "text", text: " and " },
          { kind: "slot", blankId: "b2" },
          { kind: "text", text: " and " },
          { kind: "slot", blankId: "b3" },
          { kind: "text", text: "." },
        ],
        blanks: [
          blank("dest", 0.1, {
            role: "destination",
            assumed: "email",
            options: [
              { id: "email", label: "email it to you" },
              { id: "display", label: "show it to you here" },
            ],
          }),
          blank("b1", 0.9),
          blank("b2", 0.8),
          blank("b3", 0.7),
        ],
      }),
      context
    );

    const destination = brief!.blanks.find(
      (entry) => entry.role === "destination"
    );
    // Lowest weight of the four, and still a question: guaranteed slots are
    // never demoted by rank.
    expect(destination?.asked).toBe(true);
    expect(brief!.blanks.filter((entry) => entry.asked !== false)).toHaveLength(
      MAX_ASKED_BLANKS + 1
    );
    expect(brief!.blanks.find((entry) => entry.id === "b3")?.asked).toBe(false);
  });

  it("drops a blank with no assumption rather than inventing one", () => {
    // Without an assumption the sentence cannot render and "Just try it"
    // would be a lie, so the blank cannot be kept.
    const brief = normalizeBrief(
      rawBrief({
        blanks: [blank("dest", 1, { assumed: "   " })],
      }),
      context
    );

    expect(brief?.blanks).toEqual([]);
    expect(renderBriefSentence(brief!)).toBe("Sort my support email and ….");
  });

  it("drops a choice that is not actually a choice", () => {
    const brief = normalizeBrief(
      rawBrief({
        blanks: [blank("dest", 1, { options: [{ id: "a", label: "only" }] })],
      }),
      context
    );

    expect(brief?.blanks).toEqual([]);
  });

  it("refuses a destination the workspace cannot build", () => {
    // Offering "post it to Slack" to an org with no Slack is a promise the run
    // cannot keep — the one failure this whole feature exists to prevent.
    const brief = normalizeBrief(
      rawBrief({
        blanks: [
          blank("dest", 1, {
            role: "destination",
            assumed: "email",
            options: [
              { id: "email", label: "email it to you" },
              { id: "slack", label: "post it to Slack" },
            ],
          }),
        ],
      }),
      context
    );

    expect(brief?.blanks).toEqual([]);
    // And the slot collapses to a real destination's words, not a bare id.
    expect(renderBriefSentence(brief!)).toBe(
      "Sort my support email and email it to you."
    );
  });

  it("coerces an invented destination id to one that exists", () => {
    const brief = normalizeBrief(
      rawBrief({ destinationId: "carrier-pigeon", blanks: [] }),
      context
    );
    // Email rather than display: it needs no account, and it reaches the
    // person who asked instead of a tab they have probably closed.
    expect(brief?.destinationId).toBe("email");
  });

  it("falls back to a manual trigger when the model invents one", () => {
    const brief = normalizeBrief(rawBrief({ trigger: "telepathy" }), context);
    expect(brief?.trigger).toBe("manual");
  });

  it("gives up when there is no sentence at all", () => {
    expect(normalizeBrief({ segments: [] }, context)).toBeUndefined();
  });

  // One answer box cannot hold two answers, so the second half was being lost.
  it("reduces a two-part question to the half that can be answered", () => {
    const brief = normalizeBrief(
      rawBrief({
        blanks: [
          {
            id: "dest",
            type: "open",
            question: "What starts this, and which blog post?",
            assumed: "a new post appears",
            weight: 1,
            role: "trigger",
          },
        ],
      }),
      context
    );

    expect(brief?.blanks[0].question).toBe("What starts this?");
  });

  it("leaves a single question containing 'and' alone", () => {
    const brief = normalizeBrief(
      rawBrief({
        blanks: [
          {
            id: "dest",
            type: "open",
            question: "Which posts and comments?",
            assumed: "all of them",
            weight: 1,
            role: "subject",
          },
        ],
      }),
      context
    );

    expect(brief?.blanks[0].question).toBe("Which posts and comments?");
  });

  it("strips a triggerValue naming no real trigger, and any off a trigger blank", () => {
    const brief = normalizeBrief(
      rawBrief({
        segments: [
          { kind: "slot", blankId: "when" },
          { kind: "text", text: " do it and " },
          { kind: "slot", blankId: "dest" },
          { kind: "text", text: "." },
        ],
        blanks: [
          blank("when", 0.3, {
            role: "trigger",
            assumed: "manual",
            options: [
              {
                id: "manual",
                label: "When you run this",
                triggerValue: "manual",
              },
              {
                id: "psychic",
                label: "When it feels right",
                triggerValue: "telepathy",
              },
            ],
          }),
          blank("dest", 0.9, {
            role: "destination",
            assumed: "email",
            options: [
              { id: "email", label: "email it to you", triggerValue: "manual" },
              { id: "display", label: "show it to you here" },
            ],
          }),
        ],
      }),
      context
    );

    const trigger = brief!.blanks.find((entry) => entry.role === "trigger");
    expect(trigger?.type === "choice" && trigger.options[0].triggerValue).toBe(
      "manual"
    );
    expect(
      trigger?.type === "choice" && trigger.options[1].triggerValue
    ).toBeUndefined();

    // On a destination blank the field means nothing, so it does not survive.
    const destination = brief!.blanks.find(
      (entry) => entry.role === "destination"
    );
    expect(
      destination?.type === "choice" && destination.options[0].triggerValue
    ).toBeUndefined();
  });

  it("names a destination it could not reach", () => {
    const brief = normalizeBrief(
      rawBrief({ unavailableDestination: "Slack" }),
      context
    );

    expect(brief?.unavailableDestination).toBe("Slack");
  });

  it("ignores a claimed-unavailable destination we actually offer", () => {
    const brief = normalizeBrief(
      rawBrief({ unavailableDestination: "email" }),
      context
    );

    expect(brief?.unavailableDestination).toBeUndefined();
  });
});

describe("generateBrief", () => {
  const callWith = (result: Partial<GenerateResult> & { content: string }) =>
    vi.fn(async (_call: GenerateCall) => ({
      inputTokens: 40,
      outputTokens: 120,
      ...result,
    }));

  it("reads a request back and books the tokens against the fast tier", async () => {
    const callLLM = callWith({ content: JSON.stringify(completeRawBrief()) });

    const outcome = await generateBrief({
      request: "sort my support email by urgency",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM,
    });

    expect(outcome.kind).toBe("brief");
    expect(callLLM.mock.calls[0][0].tier).toBe("fast");
    expect(outcome.usage).toEqual({ inputTokens: 40, outputTokens: 120 });
  });

  it("offers complete sentences when the request is too thin", async () => {
    const callLLM = callWith({ content: "{}" });

    const outcome = await generateBrief({
      request: "automate stuff",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM,
    });

    expect(outcome.kind).toBe("suggestions");
    // Picking beats specifying when there is nothing to read back, and it
    // costs no model call at all.
    expect(callLLM).not.toHaveBeenCalled();
    if (outcome.kind === "suggestions") {
      expect(outcome.prompts).toHaveLength(3);
      expect(outcome.prompts.every((prompt) => prompt.length > 0)).toBe(true);
    }
  });

  it("honours the model saying it cannot do it", async () => {
    const outcome = await generateBrief({
      request: "make my whole business run itself",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM: callWith({ content: '{"insufficient": true}' }),
    });

    expect(outcome.kind).toBe("suggestions");
  });

  it("retries once when the answer arrives unusable, then succeeds", async () => {
    // The shape actually observed in production: `segments` encoded as a
    // string, with the array elements spilled into top-level numeric keys.
    const mangled = JSON.stringify({
      "2": { kind: "slot", blankId: "dest" },
      title: "Weekly summary",
      segments: '\n<parameter name="1">{"kind":"text","text":"When "}',
      blanks: [],
      destinationId: "display",
      trigger: "manual",
    });

    const callLLM = vi
      .fn(async (_call: GenerateCall) => ({
        inputTokens: 40,
        outputTokens: 120,
        content: JSON.stringify(completeRawBrief()),
      }))
      .mockImplementationOnce(async () => ({
        inputTokens: 40,
        outputTokens: 120,
        content: mangled,
      }));

    const outcome = await generateBrief({
      request: "sort my support email by urgency",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM,
    });

    // The point of the retry: a clear request must not be told it was vague.
    expect(outcome.kind).toBe("brief");
    expect(callLLM).toHaveBeenCalledTimes(2);
    expect(outcome.usage).toEqual({ inputTokens: 80, outputTokens: 240 });
  });

  it("reports our own failure as ours, not as a thin request", async () => {
    const outcome = await generateBrief({
      request: "sort my support email by urgency",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM: callWith({ content: "I'm sorry, I can't help with that." }),
    });

    expect(outcome.kind).toBe("failed");
    // Both attempts are billed, and both must show up in the ledger.
    expect(outcome.usage.inputTokens).toBe(80);
  });

  it("reports a thrown model call as our failure", async () => {
    const callLLM = vi.fn(async () => {
      throw new Error("upstream down");
    });

    const outcome = await generateBrief({
      request: "sort my support email by urgency",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM,
    });

    expect(outcome.kind).toBe("failed");
    expect(callLLM).toHaveBeenCalledTimes(2);
  });

  it("does not retry when the model itself says the request is too thin", async () => {
    const callLLM = callWith({ content: '{"insufficient": true}' });

    const outcome = await generateBrief({
      request: "make my whole business run itself",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM,
    });

    // That is a judgement about the request, not a fault to retry around.
    expect(outcome.kind).toBe("suggestions");
    expect(callLLM).toHaveBeenCalledTimes(1);
  });

  it("re-asks for a missing guaranteed slot, naming it", async () => {
    // First answer lacks the trigger blank; the second call must say so in
    // the prompt (which also busts the gateway cache) and its answer wins.
    const callLLM = vi
      .fn(async (_call: GenerateCall) => ({
        inputTokens: 40,
        outputTokens: 120,
        content: JSON.stringify(completeRawBrief()),
      }))
      .mockImplementationOnce(async () => ({
        inputTokens: 40,
        outputTokens: 120,
        content: JSON.stringify(rawBrief()),
      }));

    const outcome = await generateBrief({
      request: "sort my support email by urgency",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM,
    });

    expect(outcome.kind).toBe("brief");
    expect(callLLM).toHaveBeenCalledTimes(2);
    const secondPrompt = callLLM.mock.calls[1][0].messages[0].content;
    expect(secondPrompt).toContain("left out required moving parts: trigger");
    if (outcome.kind === "brief") {
      expect(
        outcome.brief.blanks.some((entry) => entry.role === "trigger")
      ).toBe(true);
    }
  });

  it("repairs a mangled answer and a missing slot in the same run", async () => {
    // Two unrelated transients in sequence — the corruption first, then a
    // sound brief with no trigger blank. Each gets its own retry; sharing one
    // budget used to accept the second unrepaired.
    const callLLM = vi
      .fn(async (_call: GenerateCall) => ({
        inputTokens: 40,
        outputTokens: 120,
        content: JSON.stringify(completeRawBrief()),
      }))
      .mockImplementationOnce(async () => ({
        inputTokens: 40,
        outputTokens: 120,
        content: "not even json",
      }))
      .mockImplementationOnce(async () => ({
        inputTokens: 40,
        outputTokens: 120,
        content: JSON.stringify(rawBrief()),
      }));

    const outcome = await generateBrief({
      request: "sort my support email by urgency",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM,
    });

    expect(outcome.kind).toBe("brief");
    expect(callLLM).toHaveBeenCalledTimes(3);
    if (outcome.kind === "brief") {
      expect(
        outcome.brief.blanks.some((entry) => entry.role === "trigger")
      ).toBe(true);
    }
  });

  it("accepts a brief without guaranteed slots once the attempts run out", async () => {
    // Enforcement is best-effort: a missing slot is our defect, and a person
    // with a clear request must never see it as a failure.
    const callLLM = callWith({ content: JSON.stringify(rawBrief()) });

    const outcome = await generateBrief({
      request: "sort my support email by urgency",
      destinations: DESTINATIONS,
      connectedProviders: new Set(),
      callLLM,
    });

    expect(outcome.kind).toBe("brief");
    expect(callLLM).toHaveBeenCalledTimes(2);
    // Both attempts are billed.
    expect(outcome.usage).toEqual({ inputTokens: 80, outputTokens: 240 });
  });
});

describe("grounded blanks", () => {
  const GROUNDING: GroundingContext = {
    families: [
      {
        family: "dataset",
        noun: "dataset",
        purpose: "documents workflows search",
        creatable: true,
        instances: [
          { id: "ds-1", name: "Product docs" },
          { id: "ds-2", name: "Support KB" },
        ],
        triggerKinds: [],
        consumerCount: 1,
      },
      {
        family: "discord",
        noun: "Discord bot",
        purpose: "a messaging identity",
        creatable: false,
        instances: [{ id: "bot-1", name: "HelpBot" }],
        triggerKinds: [],
        consumerCount: 1,
      },
    ],
    aiModels: "models",
  };

  const groundedContext = { ...context, grounding: GROUNDING };

  function datasetBlank(options: Record<string, unknown>[], assumed = "docs") {
    return rawBrief({
      segments: [
        { kind: "text", text: "Answer questions from " },
        { kind: "slot", blankId: "source" },
        { kind: "text", text: "." },
      ],
      blanks: [
        blank("source", 0.8, {
          role: "subject",
          grounding: { family: "dataset" },
          assumed,
          options,
        }),
      ],
    });
  }

  it("resolves component names to ids the model never saw", () => {
    const brief = normalizeBrief(
      datasetBlank([
        { id: "docs", label: "the product docs", resourceName: "Product docs" },
        { id: "kb", label: "the support KB", resourceName: "support kb" },
        { id: "new", label: "a new dataset", createNew: true },
      ]),
      groundedContext
    );

    const source = brief!.blanks.find((entry) => entry.id === "source");
    expect(source?.type === "choice" && source.options).toEqual([
      { id: "docs", label: "the product docs", resourceId: "ds-1" },
      { id: "kb", label: "the support KB", resourceId: "ds-2" },
      { id: "new", label: "a new dataset", createNew: true },
    ]);
  });

  it("drops an option naming nothing real, and follows the assumption to a survivor", () => {
    const brief = normalizeBrief(
      datasetBlank([
        { id: "docs", label: "the product docs", resourceName: "Nonexistent" },
        { id: "kb", label: "the support KB", resourceName: "Support KB" },
        { id: "new", label: "a new dataset", createNew: true },
      ]),
      groundedContext
    );

    const source = brief!.blanks.find((entry) => entry.id === "source");
    expect(source?.type === "choice" && source.options.length).toBe(2);
    // Reassigned to the surviving existing instance, not to "create" — a
    // created duplicate of something owned is never the default.
    expect(source?.assumed).toBe("kb");
  });

  it("drops a create option on a family that cannot be created", () => {
    const brief = normalizeBrief(
      rawBrief({
        segments: [
          { kind: "text", text: "Reply via " },
          { kind: "slot", blankId: "bot" },
          { kind: "text", text: "." },
        ],
        blanks: [
          blank("bot", 0.8, {
            role: "detail",
            grounding: { family: "discord" },
            assumed: "helpbot",
            options: [
              { id: "helpbot", label: "HelpBot", resourceName: "HelpBot" },
              { id: "new", label: "a new bot", createNew: true },
            ],
          }),
        ],
      }),
      groundedContext
    );

    // With the create option gone only one option is left — not a choice, so
    // the blank is decided and collapses into the words it read as.
    expect(brief!.blanks.find((entry) => entry.id === "bot")).toBeUndefined();
    expect(renderBriefSentence(brief!)).toBe("Reply via HelpBot.");
  });

  it("strips a grounding claim against a family we know nothing about", () => {
    const brief = normalizeBrief(
      datasetBlank(
        [
          { id: "a", label: "alpha" },
          { id: "b", label: "beta" },
        ],
        "a"
      ),
      { ...context, grounding: { families: [], aiModels: "" } }
    );

    const source = brief!.blanks.find((entry) => entry.id === "source");
    expect(source?.grounding).toBeUndefined();
    expect(source?.type === "choice" && source.options.length).toBe(2);
  });

  it("keeps ungrounded options on a grounded blank", () => {
    const brief = normalizeBrief(
      datasetBlank(
        [
          {
            id: "docs",
            label: "the product docs",
            resourceName: "Product docs",
          },
          { id: "paste", label: "the text you paste in" },
        ],
        "paste"
      ),
      groundedContext
    );

    const source = brief!.blanks.find((entry) => entry.id === "source");
    expect(source?.type === "choice" && source.options).toEqual([
      { id: "docs", label: "the product docs", resourceId: "ds-1" },
      { id: "paste", label: "the text you paste in" },
    ]);
    expect(source?.assumed).toBe("paste");
  });
});

describe("missingBriefRoles", () => {
  it("misses the trigger slot when there is none", () => {
    const brief = normalizeBrief(rawBrief(), context);
    expect(missingBriefRoles(brief!)).toEqual(["trigger"]);
  });

  it("is satisfied by a complete brief", () => {
    const brief = normalizeBrief(completeRawBrief(), context);
    expect(missingBriefRoles(brief!)).toEqual([]);
  });

  it("requires a destination blank only when there is a real choice", () => {
    const several = normalizeBrief(rawBrief({ blanks: [] }), context);
    expect(missingBriefRoles(several!)).toEqual(["trigger", "destination"]);

    const single = normalizeBrief(rawBrief({ blanks: [] }), {
      ...context,
      destinations: [EMAIL],
    });
    expect(missingBriefRoles(single!)).toEqual(["trigger"]);
  });
});

describe("briefViolations", () => {
  it("clears a brief that carries its moving parts", () => {
    const brief = normalizeBrief(completeRawBrief(), context);
    expect(
      briefViolations(brief!, {
        id: "fixture",
        prompt: "sort my support email",
        expectTrigger: "manual",
        expectRoles: ["trigger", "destination"],
        expectDestinationId: "email",
      })
    ).toEqual([]);
  });

  it("names each missing part in words worth reading", () => {
    const brief = normalizeBrief(rawBrief({ blanks: [] }), context);
    const violations = briefViolations(brief!, {
      id: "fixture",
      prompt: "sort my support email",
      expectRoles: ["trigger", "destination"],
      expectGrounded: { family: "dataset" },
    });

    expect(violations).toContain('no blank with role "trigger"');
    expect(violations).toContain('no blank with role "destination"');
    expect(violations).toContain('no grounded "dataset" blank');
  });
});

describe("briefSuggestions", () => {
  it("always offers three distinct complete requests", () => {
    for (const request of ["", "automate", "post to social media"]) {
      const { prompts } = briefSuggestions(request);
      expect(prompts).toHaveLength(3);
      expect(new Set(prompts).size).toBe(3);
    }
  });

  it("admits when the prompts are padding rather than a guess", () => {
    // Nothing in the catalogue scores against this, so the three it returns
    // are filler — and the screen has to be able to tell, or it claims to
    // have understood something it did not.
    expect(briefSuggestions("qwertyuiop zxcvbnm").matched).toBe(false);
    expect(briefSuggestions("post my blog updates to discord").matched).toBe(
      true
    );
  });
});

describe("unlinked destinations in a brief", () => {
  const DISCORD_UNLINKED: BriefDestination = {
    id: "discord",
    kind: "integration",
    provider: "discord",
    label: "post it to Discord",
    nodeTypes: ["send-message-discord"],
    requiresConnection: true,
  };

  const withDiscord = {
    request: "post my updates to discord",
    destinations: [DISCORD_UNLINKED, EMAIL, DISPLAY],
  };

  it("keeps an unlinked option on offer", () => {
    const brief = normalizeBrief(
      rawBrief({
        blanks: [
          blank("dest", 1, {
            role: "destination",
            assumed: "discord",
            options: [
              { id: "discord", label: "post it to Discord" },
              { id: "email", label: "email it to you" },
            ],
          }),
        ],
      }),
      withDiscord
    );

    // The user asked for Discord. Dropping the option would be the silent
    // substitution this feature exists to remove.
    expect(
      brief?.blanks[0]?.type === "choice" &&
        brief.blanks[0].options.map((option) => option.id)
    ).toEqual(["discord", "email"]);
  });

  it("keeps the assumption on it rather than swapping in a linked account", () => {
    const brief = normalizeBrief(
      rawBrief({
        blanks: [
          blank("dest", 1, {
            role: "destination",
            assumed: "discord",
            options: [
              { id: "discord", label: "post it to Discord" },
              { id: "email", label: "email it to you" },
            ],
          }),
        ],
      }),
      withDiscord
    );

    // This used to move the assumption to whatever was already linked, so
    // "post it to Discord" could silently become "post it to X" purely because
    // X was the one connected account. Asking someone to link the account they
    // named is a far smaller imposition than sending their content elsewhere,
    // so the assumption stays put and the page shows the connect card.
    expect(brief?.blanks[0]?.assumed).toBe("discord");
  });

  it("keeps an unlinked destination as the brief-level default", () => {
    const brief = normalizeBrief(
      rawBrief({ destinationId: "discord", blanks: [] }),
      withDiscord
    );
    expect(brief?.destinationId).toBe("discord");
  });

  it("falls back to the user, never to another audience", () => {
    const brief = normalizeBrief(
      rawBrief({ destinationId: "slack-which-does-not-exist", blanks: [] }),
      withDiscord
    );

    // A destination we cannot offer falls back to one that reaches the person
    // who asked — never to a channel with an audience they never named. Email
    // qualifies: it goes to them. Discord would not, even were it linked.
    expect(brief?.destinationId).toBe("email");
  });

  it("will not assume an unlinked account the request never named", () => {
    const brief = normalizeBrief(
      rawBrief({
        blanks: [
          blank("dest", 1, {
            role: "destination",
            assumed: "discord",
            options: [
              { id: "discord", label: "post it to Discord" },
              { id: "email", label: "email it to you" },
            ],
          }),
        ],
      }),
      // The request is about email and says nothing about Discord.
      { ...withDiscord, request: "summarize it and email it to me" }
    );

    // Otherwise the person gets a Connect button and a dead Build button for
    // an account they never mentioned, with their own words on screen asking
    // for something a plain email would have satisfied.
    expect(brief?.blanks[0]?.assumed).toBe("email");
  });
});
