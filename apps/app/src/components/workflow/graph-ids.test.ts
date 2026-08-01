import { describe, expect, it } from "vitest";

import { createEdgeId, createNodeId } from "./graph-ids";

describe("createNodeId", () => {
  it("never collides across a tight loop", () => {
    // The regression this guards: ids used to be derived from Date.now(), so
    // pasting or duplicating several nodes in the same millisecond produced
    // duplicates, which rewired edges onto the wrong node.
    const ids = new Set(
      Array.from({ length: 1000 }, () => createNodeId("text"))
    );
    expect(ids.size).toBe(1000);
  });

  it("prefixes with the node type", () => {
    expect(createNodeId("text")).toMatch(/^text-/);
  });

  it("falls back to a generic prefix for an unknown type", () => {
    expect(createNodeId(undefined)).toMatch(/^node-/);
  });
});

describe("createEdgeId", () => {
  it("is stable for the same endpoints", () => {
    expect(createEdgeId("a", "out", "b", "in")).toBe(
      createEdgeId("a", "out", "b", "in")
    );
  });

  it("distinguishes handles on the same node pair", () => {
    expect(createEdgeId("a", "out1", "b", "in")).not.toBe(
      createEdgeId("a", "out2", "b", "in")
    );
  });

  it("distinguishes direction", () => {
    expect(createEdgeId("a", "out", "b", "in")).not.toBe(
      createEdgeId("b", "out", "a", "in")
    );
  });
});
