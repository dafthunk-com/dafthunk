import type { BriefDestination } from "@dafthunk/types";
import { renderBriefSentence } from "@dafthunk/utils";
import { describe, expect, it, vi } from "vitest";

import { briefSuggestions, generateBrief, normalizeBrief } from "./brief";
import { MAX_ASKED_BLANKS } from "./config";
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

describe("normalizeBrief", () => {
  it("keeps a well-formed brief intact", () => {
    const brief = normalizeBrief(rawBrief(), context);

    expect(brief?.blanks).toHaveLength(1);
    expect(renderBriefSentence(brief!)).toBe(
      "Sort my support email and email it to you."
    );
  });

  it("enforces the blank budget whatever the model returns", () => {
    // The prompt asks for two. The budget is not a request.
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

    expect(brief?.blanks).toHaveLength(MAX_ASKED_BLANKS);
    // Ranked by impact, not by the order the model happened to emit.
    expect(brief?.blanks.map((entry) => entry.id)).toEqual(["b2", "b3"]);
  });

  it("turns a dropped blank into the words it was going to read as", () => {
    const brief = normalizeBrief(
      rawBrief({
        segments: [
          { kind: "text", text: "Do " },
          { kind: "slot", blankId: "b1" },
          { kind: "text", text: " and " },
          { kind: "slot", blankId: "b2" },
          { kind: "text", text: " and " },
          { kind: "slot", blankId: "b3" },
          { kind: "text", text: "." },
        ],
        blanks: [blank("b1", 0.9), blank("b2", 0.8), blank("b3", 0.1)],
      }),
      context
    );

    // b3 lost the budget, so it is decided rather than missing — the sentence
    // still says what will happen.
    expect(renderBriefSentence(brief!)).toBe("Do b1-a and b2-a and b3-a.");
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
    expect(brief?.destinationId).toBe("display");
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
    const callLLM = callWith({ content: JSON.stringify(rawBrief()) });

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
        content: JSON.stringify(rawBrief()),
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

  it("moves the assumption off it", () => {
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

    // "Just try it" has to build something without an OAuth round trip first.
    expect(brief?.blanks[0]?.assumed).toBe("email");
  });

  it("refuses an unlinked destination as the brief-level default", () => {
    const brief = normalizeBrief(
      rawBrief({ destinationId: "discord", blanks: [] }),
      withDiscord
    );
    expect(brief?.destinationId).not.toBe("discord");
  });
});
