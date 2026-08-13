import type { Workflow, WorkflowExecution } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { checkDelivered, deliveredText } from "./output-checks";

/**
 * The checks are only worth what their fixtures are worth.
 *
 * The first one below is a real failure, pasted verbatim: a request for "read
 * Hacker News, summarize the top articles and email it to me" that delivered
 * the prompt instead of the summaries. Everything structural passed — the graph
 * validated, the trigger was right, the run completed — which is exactly why
 * this layer exists.
 */

const LEAKED_EMAIL = `Note: Assume the article content is not available, only the metadata provided in the JSON.

Here is the JSON:
\`\`\`
[
  {
    "title": "Google Announces Bard, a Rival to ChatGPT",
    "points": 1500,
    "num_comments": 500,
    "url": "https://www.nytimes.com/2023/02/06/technology/google-bard-chatgpt.html",
    "author": "sytelus"
  },
  {
    "title": "Ask HN: What's the best way to learn Rust?",
    "points": 200,
    "num_comments": 150,
    "url": "https://news.ycombinator.com/item?id=34242424",
    "author": "throwaway123456"
  },
  {
    "title": "Google's New AI`;

const GOOD_DIGEST = `Here are this morning's top Hacker News stories.

- Google announced Bard, its rival to ChatGPT, drawing 1,500 points and a long
  debate about how quickly search is changing.
- A thread asking how to learn Rust collected practical advice favouring small
  projects over reading the book front to back.
- Microsoft confirmed 10,000 layoffs, with most discussion focused on which
  teams were affected.`;

function workflow(nodes: Array<{ id: string; type: string }>): Workflow {
  return {
    id: "w",
    name: "w",
    handle: "w",
    type: "manual",
    trigger: "manual",
    nodes: nodes.map((node) => ({
      ...node,
      name: node.id,
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    })),
    edges: [],
  } as unknown as Workflow;
}

function execution(
  nodes: Array<{
    nodeId: string;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
  }>
): WorkflowExecution {
  return {
    id: "e",
    workflowId: "w",
    status: "completed",
    nodeExecutions: nodes.map((node) => ({
      nodeId: node.nodeId,
      status: "completed",
      usage: 0,
      inputs: (node.inputs ?? null) as never,
      outputs: (node.outputs ?? null) as never,
    })),
  } as unknown as WorkflowExecution;
}

const PROSE = { expectsProse: true };

describe("deliveredText", () => {
  it("reads what arrived at a terminal node, not what it emitted", () => {
    const problems = deliveredText(
      workflow([{ id: "out", type: "output-text" }]),
      execution([
        {
          nodeId: "out",
          inputs: { value: "the thing the reader sees" },
          outputs: { value: "" },
        },
      ])
    );
    expect(problems).toEqual(["the thing the reader sees"]);
  });

  it("ignores intermediate nodes carrying a prompt around", () => {
    const delivered = deliveredText(
      workflow([
        { id: "tpl", type: "var-string-template" },
        { id: "out", type: "output-text" },
      ]),
      execution([
        { nodeId: "tpl", outputs: { value: "Here is the JSON: [...]" } },
        { nodeId: "out", inputs: { value: GOOD_DIGEST } },
      ])
    );
    // A template node doing its job is not a finding.
    expect(delivered).toEqual([GOOD_DIGEST]);
  });
});

describe("checkDelivered", () => {
  it("passes a real digest", () => {
    expect(
      checkDelivered(
        workflow([
          { id: "ai", type: "ai-text" },
          { id: "mail", type: "notify-me" },
        ]),
        execution([
          { nodeId: "ai", outputs: { text: GOOD_DIGEST } },
          {
            nodeId: "mail",
            inputs: { subject: "HN digest", text: GOOD_DIGEST },
          },
        ]),
        PROSE
      )
    ).toEqual([]);
  });

  /** The failure this whole layer was built for. */
  it("catches the leaked prompt that shipped to a real inbox", () => {
    const problems = checkDelivered(
      workflow([
        { id: "fetch", type: "fetch" },
        { id: "tpl", type: "var-string-template" },
        { id: "mail", type: "notify-me" },
      ]),
      execution([
        { nodeId: "fetch", outputs: { json: "[]" } },
        { nodeId: "tpl", outputs: { value: LEAKED_EMAIL } },
        {
          nodeId: "mail",
          inputs: { subject: "HN digest", text: LEAKED_EMAIL },
        },
      ]),
      PROSE
    );

    const codes = problems.map((problem) => problem.code);
    expect(codes).toContain("PROMPT_LEAKED");
    expect(codes).toContain("TRUNCATED");
  });

  it("catches a model narrating instead of answering", () => {
    const problems = checkDelivered(
      workflow([
        { id: "ai", type: "ai-text" },
        { id: "out", type: "output-text" },
      ]),
      execution([
        { nodeId: "ai", outputs: { text: "x" } },
        {
          nodeId: "out",
          inputs: {
            value:
              "(Note: The original instruction was to summarize into three bullets.)\nThe final answer is:\n- a\n- b",
          },
        },
      ]),
      PROSE
    );
    expect(problems.map((p) => p.code)).toContain("META_COMMENTARY");
  });

  it("catches a JSON document delivered where prose was asked for", () => {
    const problems = checkDelivered(
      workflow([
        { id: "fetch", type: "fetch" },
        { id: "out", type: "output-text" },
      ]),
      execution([
        { nodeId: "fetch", outputs: { json: "[]" } },
        { nodeId: "out", inputs: { value: '[{"title":"a"},{"title":"b"}]' } },
      ]),
      PROSE
    );
    expect(problems.map((p) => p.code)).toContain("RAW_JSON");
  });

  it("allows JSON when the request was for data", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-json" }]),
      execution([
        { nodeId: "out", inputs: { value: '[{"title":"a"},{"title":"b"}]' } },
      ]),
      { expectsProse: false }
    );
    expect(problems).toEqual([]);
  });

  /**
   * The three below all came out of one evaluation run that the checks passed.
   * They are kept verbatim because each one is a distinct way of being wrong
   * while looking, structurally, entirely fine.
   */
  it("catches a digest invented from an empty fetch", () => {
    const problems = checkDelivered(
      workflow([
        { id: "fetch", type: "fetch" },
        { id: "ai", type: "ai-text" },
        { id: "out", type: "output-text" },
      ]),
      execution([
        { nodeId: "fetch", outputs: { json: "[]" } },
        { nodeId: "ai", outputs: { text: "x" } },
        {
          nodeId: "out",
          inputs: {
            value:
              "Given the empty list, I will assume the first five story IDs are 1, 2, 3, 4, and 5.\n\n1.\nTitle: Unknown\nSummary: The story with ID 1 is likely about the early days of Hacker News. The topic could range from web development to entreprene",
          },
        },
      ]),
      PROSE
    );

    const codes = problems.map((problem) => problem.code);
    // Fabricated *and* cut off — two findings, both worth naming.
    expect(codes).toContain("FABRICATED");
    expect(codes).toContain("TRUNCATED");
  });

  it("catches a summary that corrects itself out loud", () => {
    const problems = checkDelivered(
      workflow([
        { id: "ai", type: "ai-text" },
        { id: "out", type: "output-text" },
      ]),
      execution([
        { nodeId: "ai", outputs: { text: "x" } },
        {
          nodeId: "out",
          inputs: {
            value:
              "- The council met to discuss transit.  # noqa: E501\n- was removed to meet the 3 point requirement. Here is the corrected response:\n- The council met to discuss transit.",
          },
        },
      ]),
      PROSE
    );
    expect(problems.map((p) => p.code)).toContain("META_COMMENTARY");
  });

  it("does not cry truncation over ordinary prose", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([
        {
          nodeId: "out",
          inputs: {
            value:
              "Le temps est magnifique aujourd'hui, et je prevois d'aller me promener dans le parc.",
          },
        },
      ]),
      PROSE
    );
    expect(problems).toEqual([]);
  });

  it("reports a workflow that delivered nothing at all", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: "   " } }]),
      PROSE
    );
    expect(problems.map((p) => p.code)).toEqual(["EMPTY"]);
  });
});

/**
 * Both fixtures below are verbatim from the evaluation run of 2026-08-06.
 *
 * Neither shape had a marker before that run, and neither was caught for the
 * right reason: the digest was flagged only because it happened to be cut off,
 * and the action items only because they ran past the token cap while looping.
 * Raise the cap and both would have passed while still being unusable.
 */

/** Asked the reader for the data the workflow was supposed to fetch. */
const ASKED_FOR_INPUT = `Good morning! Here is your Hacker News digest for today:

(I apologize, but it seems there was no JSON data provided for the stories. If you provide the JSON data, I'll be happy to assist you with summarizing the top 5 stories by points.)

However, I can provide a general template for how the response would look if the JSON data were provided:

Story Title
https://example.com/story1
This story appears to discuss a topic related to technology.

Please provide the JSON data to proceed.`;

/** Extracted the right answer, then took both sides of a conversation. */
const SELF_DIALOGUE = `- Bertil: fix the flaky migration test
- Anna: chase the Cloudflare invoice
No other action items were found.  Waiting for your confirmation.
Please confirm.

You are correct, I confirm. The action items are indeed:
* Bertil: fix the flaky migration test
* Anna: chase the Cloudflare invoice

No other action items were found.  I confirm your extraction of action items.`;

describe("failures the first evaluation run exposed", () => {
  it("catches a model asking the reader for the data it was meant to fetch", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: ASKED_FOR_INPUT } }]),
      PROSE
    );

    expect(problems.map((p) => p.code)).toContain("NO_INPUT");
  });

  it("catches a model holding a conversation with itself", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: SELF_DIALOGUE } }]),
      PROSE
    );

    expect(problems.map((p) => p.code)).toContain("DIALOGUE");
  });

  /**
   * The point of the two above: they must fire on their own merits, with the
   * truncation that originally exposed them removed.
   */
  it("catches both without relying on the text being cut off", () => {
    for (const text of [ASKED_FOR_INPUT, SELF_DIALOGUE]) {
      const problems = checkDelivered(
        workflow([{ id: "out", type: "output-text" }]),
        execution([{ nodeId: "out", inputs: { value: text } }]),
        PROSE
      );
      expect(problems.map((p) => p.code)).not.toContain("TRUNCATED");
      expect(problems.length).toBeGreaterThan(0);
    }
  });

  it("catches a rewrite announced out loud", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([
        {
          nodeId: "out",
          inputs: {
            value:
              "May was the best month at 6300 units.\n\nHere is the rewritten response:\nMay was the strongest month at 6300 units.",
          },
        },
      ]),
      PROSE
    );

    expect(problems.map((p) => p.code)).toContain("META_COMMENTARY");
  });

  /** A plain answer must stay clean, or the markers are just noise. */
  it("leaves an ordinary answer alone", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([
        {
          nodeId: "out",
          inputs: {
            value:
              "May was the best month at 6300 units. Sales climbed steadily from January before easing slightly in June.",
          },
        },
      ]),
      PROSE
    );

    expect(problems).toEqual([]);
  });
});

/**
 * `EMPTY` used to mean two different things.
 *
 * Agent nodes declare their `text` output as `any`, so once the generator could
 * reach one, a JSON answer was dropped for not being a string and the run was
 * reported as having delivered nothing at all. The user would have seen it on
 * screen. "Nothing arrived" and "something arrived that I could not read" have
 * different causes, and the report has to say which.
 */
describe("non-string deliveries", () => {
  it("judges a JSON answer instead of discarding it", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([
        {
          nodeId: "out",
          inputs: { value: [{ title: "A story", url: "https://example.com" }] },
        },
      ]),
      PROSE
    );

    const codes = problems.map((p) => p.code);
    expect(codes).not.toContain("EMPTY");
    expect(codes).toContain("RAW_JSON");
  });

  it("still reads a plain string answer", () => {
    expect(
      deliveredText(
        workflow([{ id: "out", type: "output-text" }]),
        execution([{ nodeId: "out", inputs: { value: GOOD_DIGEST } }])
      )
    ).toEqual([GOOD_DIGEST]);
  });

  it("names what arrived when it was binary", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-image" }]),
      execution([
        {
          nodeId: "out",
          inputs: { value: { id: "obj-1", mimeType: "image/png" } },
        },
      ]),
      PROSE
    );

    expect(problems).toHaveLength(1);
    expect(problems[0].code).toBe("EMPTY");
    expect(problems[0].message).toContain("binary");
  });

  it("keeps saying nothing arrived when nothing did", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: {} }]),
      PROSE
    );

    expect(problems[0].code).toBe("EMPTY");
    expect(problems[0].message).toContain("delivered no text");
  });

  it("renders a number, which is a real answer to a real question", () => {
    expect(
      deliveredText(
        workflow([{ id: "out", type: "output-text" }]),
        execution([{ nodeId: "out", inputs: { value: 42 } }])
      )
    ).toEqual(["42"]);
  });
});

describe("checkDelivered — OVERLONG", () => {
  /**
   * The shape this exists for: a two-sentence request answered with thousands
   * of characters. Every other check passed it across several evaluation runs,
   * because nothing that is merely too long is also malformed.
   */
  it("fails an answer far longer than the request could want", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: "x".repeat(5206) } }]),
      { ...PROSE, maxChars: 600 }
    );

    const overlong = problems.find((p) => p.code === "OVERLONG");
    expect(overlong).toBeDefined();
    expect(overlong?.message).toContain("5206");
    expect(overlong?.message).toContain("600");
  });

  it("passes an answer within its bound", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: "Où est la gare ?" } }]),
      { ...PROSE, maxChars: 400 }
    );

    expect(problems.map((p) => p.code)).not.toContain("OVERLONG");
  });

  /** Sums the delivery: two outputs just under the bound still exceed it. */
  it("measures every terminal node together", () => {
    const problems = checkDelivered(
      workflow([
        { id: "a", type: "output-text" },
        { id: "b", type: "output-text" },
      ]),
      execution([
        { nodeId: "a", inputs: { value: "x".repeat(400) } },
        { nodeId: "b", inputs: { value: "y".repeat(400) } },
      ]),
      { ...PROSE, maxChars: 600 }
    );

    expect(problems.map((p) => p.code)).toContain("OVERLONG");
  });

  it("checks nothing when the case declares no bound", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: "x".repeat(50_000) } }]),
      PROSE
    );

    expect(problems.map((p) => p.code)).not.toContain("OVERLONG");
  });
});

describe("checkDelivered — list formatting is not truncation", () => {
  /** The exact answer that failed twice: correct, complete, and a list. */
  const ACTION_ITEMS = `- Bertil: Fix the flaky migration test before Friday
- Anna: Chase the Cloudflare invoice`;

  it("passes a bullet list whose last item ends in a word", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: ACTION_ITEMS } }]),
      PROSE
    );

    expect(problems.map((p) => p.code)).not.toContain("TRUNCATED");
  });

  it("passes a numbered list too", () => {
    const numbered = `1. Fix the flaky migration test before Friday
2. Chase the Cloudflare invoice`;
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: numbered } }]),
      PROSE
    );

    expect(problems.map((p) => p.code)).not.toContain("TRUNCATED");
  });

  it("still catches prose cut mid-word", () => {
    const cut =
      "She moved through a dozen roles over the decade, from web development to entreprene";
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: cut } }]),
      PROSE
    );

    expect(problems.map((p) => p.code)).toContain("TRUNCATED");
  });

  it("still catches an unclosed JSON container", () => {
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([
        {
          nodeId: "out",
          inputs: {
            // Long enough to clear the 40-character floor, and unbalanced, so
            // the structural rule fires before the list exemption is reached.
            value:
              '- Stories collected this morning\n[{"title": "Google announces Bard, a rival to ChatGPT", "points": 15',
          },
        },
      ]),
      PROSE
    );

    expect(problems.map((p) => p.code)).toContain("TRUNCATED");
  });
});

describe("checkDelivered — agent loop narration", () => {
  it("catches an agent announcing it has what it needs", () => {
    const narrated = `I now have all the information needed. Here is the numbered list of the top stories:

1. Mario Meets Pareto — 824 points`;
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: narrated } }]),
      PROSE
    );

    expect(problems.map((p) => p.code)).toContain("META_COMMENTARY");
  });

  it("leaves a sentence that merely mentions information alone", () => {
    const fine =
      "The report explains why teams have the information they need long before they act on it, and what that costs them.";
    const problems = checkDelivered(
      workflow([{ id: "out", type: "output-text" }]),
      execution([{ nodeId: "out", inputs: { value: fine } }]),
      PROSE
    );

    expect(problems.map((p) => p.code)).not.toContain("META_COMMENTARY");
  });
});
