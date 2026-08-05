import type { NodeType, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { isOutward, outwardActions } from "./outward-actions";

function nodeType(overrides: Partial<NodeType> & { type: string }): NodeType {
  return {
    id: overrides.type,
    name: overrides.type,
    description: "",
    tags: [],
    inputs: [],
    outputs: [],
    ...overrides,
  } as NodeType;
}

const INTEGRATION_INPUT = {
  name: "integration",
  type: "integration",
  provider: "x",
  required: true,
} as unknown as NodeType["inputs"][number];

describe("isOutward", () => {
  it("treats a provider-backed write as outward", () => {
    expect(
      isOutward(nodeType({ type: "share-post-x", inputs: [INTEGRATION_INPUT] }))
    ).toBe(true);
  });

  it("exempts a provider-backed read", () => {
    expect(
      isOutward(nodeType({ type: "get-post-x", inputs: [INTEGRATION_INPUT] }))
    ).toBe(false);
  });

  it("catches senders that carry no integration input", () => {
    expect(isOutward(nodeType({ type: "send-email" }))).toBe(true);
    expect(isOutward(nodeType({ type: "notify-me" }))).toBe(true);
  });

  it("leaves ordinary compute alone", () => {
    expect(isOutward(nodeType({ type: "string-template" }))).toBe(false);
    expect(isOutward(nodeType({ type: "fetch" }))).toBe(false);
  });

  /**
   * The property that matters most. A node nobody has classified yet must be
   * gated rather than run, because the cost of the two mistakes is not
   * symmetric: an unnecessary confirmation wastes a click, and a missing one
   * publishes to somebody's account.
   */
  it("treats an unrecognised provider-backed node as outward", () => {
    expect(
      isOutward(
        nodeType({ type: "some-future-x-node", inputs: [INTEGRATION_INPUT] })
      )
    ).toBe(true);
  });
});

describe("outwardActions", () => {
  const types = [
    nodeType({
      type: "share-post-x",
      name: "Share Post",
      inputs: [INTEGRATION_INPUT],
    }),
    nodeType({ type: "string-template", name: "Template" }),
    nodeType({ type: "send-email", name: "Send Email" }),
  ];

  it("returns nothing for a graph that only computes", () => {
    const workflow = {
      nodes: [
        { id: "a", type: "string-template", name: "Template", inputs: [] },
      ],
      edges: [],
    } as unknown as Workflow;

    expect(outwardActions(workflow, types)).toEqual([]);
  });

  it("shows literal values that would be sent", () => {
    const workflow = {
      nodes: [
        {
          id: "mail",
          type: "send-email",
          name: "Send Email",
          inputs: [
            { name: "to", type: "string", value: "someone@example.com" },
            { name: "subject", type: "string", value: "Your digest" },
          ],
        },
      ],
      edges: [],
    } as unknown as Workflow;

    const [action] = outwardActions(workflow, types);
    expect(action.details).toEqual([
      { label: "To", value: "someone@example.com" },
      { label: "Subject", value: "Your digest" },
    ]);
  });

  it("does not show a literal that an edge overwrites", () => {
    const workflow = {
      nodes: [
        { id: "t", type: "string-template", name: "Template", inputs: [] },
        {
          id: "mail",
          type: "send-email",
          name: "Send Email",
          inputs: [
            { name: "to", type: "string", value: "someone@example.com" },
            { name: "subject", type: "string", value: "stale placeholder" },
          ],
        },
      ],
      edges: [
        {
          source: "t",
          target: "mail",
          sourceOutput: "value",
          targetInput: "subject",
        },
      ],
    } as unknown as Workflow;

    const [action] = outwardActions(workflow, types);
    // Reporting the placeholder would misdescribe what actually gets sent.
    expect(action.details).toEqual([
      { label: "To", value: "someone@example.com" },
    ]);
  });

  it("gates a node type missing from the registry", () => {
    const workflow = {
      nodes: [{ id: "x", type: "unknown-node", name: "Mystery", inputs: [] }],
      edges: [],
    } as unknown as Workflow;

    expect(outwardActions(workflow, types)).toHaveLength(1);
  });
});
