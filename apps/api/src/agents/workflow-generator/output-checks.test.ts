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
