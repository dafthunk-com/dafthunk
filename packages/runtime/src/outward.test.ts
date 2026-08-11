import type { NodeType } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { isOutward } from "./outward";

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
   * stubbed rather than run, because the cost of the two mistakes is not
   * symmetric: an unnecessary stub dulls one rehearsal, and a missing one
   * publishes to somebody's account during a run that promised not to.
   */
  it("treats an unrecognised provider-backed node as outward", () => {
    expect(
      isOutward(
        nodeType({ type: "some-future-x-node", inputs: [INTEGRATION_INPUT] })
      )
    ).toBe(true);
  });
});
