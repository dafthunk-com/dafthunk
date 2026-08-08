import type { Node, Workflow, WorkflowExecution } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  deliveredPhrase,
  deliveredValues,
  failedSteps,
  isDeliveryNode,
  terminalNodeIds,
} from "./workflow-outcome";

/**
 * The bug these guard against reached a real user.
 *
 * A Hacker News digest ran correctly, emailed itself, and the outcome screen
 * reported the whole thing as "1" — `notify-me`'s `recipientCount`, meaning one
 * person was emailed, rendered where the digest should have been and stripped of
 * its label because it was the only value on screen.
 */

function node(partial: Partial<Node> & { id: string; type: string }): Node {
  return {
    name: partial.id,
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
    ...partial,
  } as Node;
}

const SUMMARIZER = node({
  id: "summarize",
  type: "agent-claude-sonnet-4",
  inputs: [{ name: "input", type: "string" }],
  outputs: [{ name: "text", type: "string" }],
});

const NOTIFY = node({
  id: "digest",
  type: "notify-me",
  name: "Daily Digest",
  inputs: [
    { name: "subject", type: "string", value: "Your Hacker News digest" },
    { name: "text", type: "string" },
  ],
  outputs: [
    { name: "recipientCount", type: "number" },
    { name: "error", type: "string" },
  ],
});

const WORKFLOW: Workflow = {
  id: "wf",
  name: "HN digest",
  trigger: "scheduled",
  nodes: [SUMMARIZER, NOTIFY],
  edges: [
    {
      source: "summarize",
      sourceOutput: "text",
      target: "digest",
      targetInput: "text",
    },
  ],
} as Workflow;

const EXECUTION = {
  id: "exec",
  workflowId: "wf",
  status: "completed",
  nodeExecutions: [
    {
      nodeId: "summarize",
      status: "completed",
      outputs: { text: "Story one: …\nStory two: …" },
    },
    { nodeId: "digest", status: "completed", outputs: { recipientCount: 1 } },
  ],
} as unknown as WorkflowExecution;

describe("isDeliveryNode", () => {
  it("recognises a node whose every output is a receipt", () => {
    expect(isDeliveryNode(NOTIFY)).toBe(true);
  });

  it("leaves a node that actually produces something alone", () => {
    expect(isDeliveryNode(SUMMARIZER)).toBe(false);
    // The one that must keep rendering exactly as it did: an output node's
    // value *is* the answer, and treating it as a receipt would hide it.
    expect(
      isDeliveryNode(
        node({
          id: "out",
          type: "output-text",
          outputs: [{ name: "value", type: "string" }],
        })
      )
    ).toBe(false);
  });

  it("does not claim a node with no outputs at all", () => {
    expect(isDeliveryNode(node({ id: "sink", type: "output-text" }))).toBe(
      false
    );
  });
});

describe("deliveredValues", () => {
  it("recovers what was sent, from the node that produced it", () => {
    // The whole point: `previewExecution` strips node inputs from the frame, so
    // the delivered text has to come back off the edge that fed it.
    expect(deliveredValues(WORKFLOW, EXECUTION, NOTIFY)).toEqual([
      { name: "subject", text: "Your Hacker News digest" },
      { name: "text", text: "Story one: …\nStory two: …" },
    ]);
  });

  it("drops the address it was sent to", () => {
    // A distinct id so no edge feeds it — this exercises the literal path, and
    // proves the recipient is dropped rather than shown above the body.
    const addressed = node({
      ...NOTIFY,
      id: "mailer",
      inputs: [
        { name: "to", type: "string", value: "someone@example.com" },
        { name: "text", type: "string", value: "Body" },
      ],
    });

    expect(deliveredValues(WORKFLOW, EXECUTION, addressed)).toEqual([
      { name: "text", text: "Body" },
    ]);
  });

  it("prefers what an edge delivered over a literal left on the node", () => {
    // The model routinely leaves a placeholder on an input it also wires. The
    // wire is what actually ran, so it is what the screen must show.
    const withPlaceholder = node({
      ...NOTIFY,
      inputs: [{ name: "text", type: "string", value: "placeholder" }],
    });

    expect(deliveredValues(WORKFLOW, EXECUTION, withPlaceholder)).toEqual([
      { name: "text", text: "Story one: …\nStory two: …" },
    ]);
  });

  it("returns nothing rather than a blank when the value never arrived", () => {
    const unfed = node({
      ...NOTIFY,
      id: "unfed",
      inputs: [{ name: "text", type: "string" }],
    });

    expect(deliveredValues(WORKFLOW, EXECUTION, unfed)).toEqual([]);
  });
});

describe("deliveredPhrase", () => {
  it("says what happened, in the past tense", () => {
    expect(deliveredPhrase(NOTIFY)).toBe("Emailed to you");
  });

  it("falls back to something true of any delivery", () => {
    expect(
      deliveredPhrase(node({ id: "x", type: "send-carrier-pigeon" }))
    ).toBe("Sent");
  });
});

describe("terminalNodeIds", () => {
  it("is the node the answer ends at", () => {
    expect([...terminalNodeIds(WORKFLOW)]).toEqual(["digest"]);
  });
});

describe("failedSteps", () => {
  it("names what broke, keeping only the error's first line", () => {
    // The frame keeps every step's error; the partial-outcome copy used to ask
    // the user to say what should change while hiding exactly this.
    const failed = {
      ...EXECUTION,
      status: "error",
      nodeExecutions: [
        { nodeId: "summarize", status: "completed", outputs: {} },
        {
          nodeId: "digest",
          status: "error",
          error: "SMTP refused the message\n  at send (mailer.ts:42)",
        },
      ],
    } as unknown as WorkflowExecution;

    expect(failedSteps(WORKFLOW, failed)).toEqual([
      { name: "Daily Digest", error: "SMTP refused the message" },
    ]);
  });

  it("falls back to a generic subject when the node has no name", () => {
    const failed = {
      ...EXECUTION,
      nodeExecutions: [{ nodeId: "summarize", status: "error" }],
    } as unknown as WorkflowExecution;

    // SUMMARIZER's name defaults to its id in the fixture builder, so strip it.
    const anonymous = {
      ...WORKFLOW,
      nodes: [{ ...SUMMARIZER, name: "" }, NOTIFY],
    } as Workflow;

    expect(failedSteps(anonymous, failed)).toEqual([{ name: "One step" }]);
  });

  it("is empty for a clean run", () => {
    expect(failedSteps(WORKFLOW, EXECUTION)).toEqual([]);
  });
});
