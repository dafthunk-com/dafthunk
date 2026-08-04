import type { Brief, BriefDestination } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  buildSynthesisPrompt,
  renderBriefSentence,
  resolveBlank,
  resolveDestination,
  unansweredAssumptions,
} from "./workflow-brief";

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
  nodeTypes: ["output-text", "output-json"],
};

/** "Sort my support email by urgency and <destination>." */
function brief(overrides: Partial<Brief> = {}): Brief {
  return {
    version: 1,
    request: "sort my support email by urgency",
    title: "Triage support email",
    segments: [
      { kind: "text", text: "Sort my support email by urgency and " },
      { kind: "slot", blankId: "dest" },
      { kind: "text", text: " ." },
    ],
    blanks: [
      {
        id: "dest",
        type: "choice",
        question: "Where should the result go?",
        assumed: "email",
        weight: 1,
        role: "destination",
        options: [
          { id: "email", label: "email it to you" },
          { id: "display", label: "show it to you here" },
        ],
      },
    ],
    destinationOptions: [EMAIL, DISPLAY],
    destinationId: "email",
    trigger: "manual",
    ...overrides,
  };
}

describe("renderBriefSentence", () => {
  it("reads as a sentence before anything is answered", () => {
    // The unanswered state is the one the user sees first, so it has to be
    // grammatical on its own — not a form with holes in it.
    expect(renderBriefSentence(brief())).toBe(
      "Sort my support email by urgency and email it to you."
    );
  });

  it("takes the answer over the assumption", () => {
    expect(renderBriefSentence(brief(), { dest: "display" })).toBe(
      "Sort my support email by urgency and show it to you here."
    );
  });

  it("tidies the spacing the model leaves behind", () => {
    // Segments concatenate to "A  x ." — a slot flanked by spaces and a
    // detached full stop is the normal model output, not an edge case.
    const spaced = brief({
      segments: [
        { kind: "text", text: "A  " },
        { kind: "slot", blankId: "dest" },
        { kind: "text", text: " ." },
      ],
    });
    expect(renderBriefSentence(spaced, { dest: "display" })).toBe(
      "A show it to you here."
    );
  });

  it("keeps the sentence readable when a slot has no blank", () => {
    const orphaned = brief({ blanks: [] });
    expect(renderBriefSentence(orphaned)).toBe(
      "Sort my support email by urgency and …."
    );
  });

  it("falls back to the assumption when an open blank is emptied", () => {
    const open = brief({
      blanks: [
        {
          id: "dest",
          type: "open",
          question: "What counts as urgent?",
          assumed: "refunds and outages",
          prefill: "refunds and outages",
          weight: 0.6,
          role: "criterion",
        },
      ],
    });
    expect(renderBriefSentence(open, { dest: "   " })).toContain(
      "refunds and outages"
    );
  });
});

describe("resolveBlank", () => {
  it("ignores an option id that is not on offer", () => {
    const blank = brief().blanks[0];
    expect(resolveBlank(blank, { dest: "carrier-pigeon" })).toBe(
      "email it to you"
    );
  });
});

describe("resolveDestination", () => {
  it("follows the destination blank's answer", () => {
    expect(resolveDestination(brief(), { dest: "display" })).toBe(DISPLAY);
  });

  it("uses the assumption when the blank is unanswered", () => {
    expect(resolveDestination(brief())).toBe(EMAIL);
  });

  it("uses destinationId when there is no destination blank", () => {
    const noBlank = brief({ blanks: [], destinationId: "display" });
    expect(resolveDestination(noBlank)).toBe(DISPLAY);
  });

  it("never returns nothing", () => {
    const bogus = brief({ blanks: [], destinationId: "nonexistent" });
    expect(resolveDestination(bogus)).toBe(DISPLAY);
  });
});

describe("unansweredAssumptions", () => {
  it("lists what the user never confirmed", () => {
    expect(unansweredAssumptions(brief())).toEqual([
      {
        blankId: "dest",
        question: "Where should the result go?",
        assumed: "email it to you",
      },
    ]);
  });

  it("drops a blank once it is answered", () => {
    expect(unansweredAssumptions(brief(), { dest: "display" })).toEqual([]);
  });
});

describe("buildSynthesisPrompt", () => {
  it("carries the sentence, the destination and its node types", () => {
    const prompt = buildSynthesisPrompt(brief(), { dest: "email" });

    expect(prompt).toContain("Sort my support email by urgency");
    expect(prompt).toContain("email it to you");
    // Naming the node type is what keeps it inside the candidate cut.
    expect(prompt).toContain("send-email");
    expect(prompt).toContain("Trigger: manual");
  });

  it("declares the guesses it made", () => {
    const prompt = buildSynthesisPrompt(brief());
    expect(prompt).toContain("Assumed, because the request did not say:");
    expect(prompt).toContain("Where should the result go? → email it to you");
  });

  it("says nothing about assumptions when everything was answered", () => {
    const prompt = buildSynthesisPrompt(brief(), { dest: "display" });
    expect(prompt).not.toContain("Assumed");
  });
});
