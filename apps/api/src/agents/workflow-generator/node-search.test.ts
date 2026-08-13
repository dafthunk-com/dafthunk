import { describe, expect, it } from "vitest";

import { FIXTURE_NODE_TYPES } from "./fixtures/node-types";
import { findSimilarTypes, scoreNodeTypes, tokenize } from "./node-search";

describe("tokenize", () => {
  it("drops stopwords and singularizes", () => {
    expect(tokenize("Summarize the incoming emails")).toEqual([
      "summarize",
      "incoming",
      "email",
    ]);
  });
});

describe("scoreNodeTypes", () => {
  it("ranks the on-topic node above unrelated ones", () => {
    const ranked = scoreNodeTypes(
      "summarize incoming support emails",
      FIXTURE_NODE_TYPES
    );

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].nodeType.type).toBe("receive-email");

    // The geo node shares no query tokens, so it must not surface at all.
    expect(ranked.map((r) => r.nodeType.type)).not.toContain("geo-buffer");
  });

  it("returns nothing when no token matches", () => {
    expect(scoreNodeTypes("xyzzy plugh", FIXTURE_NODE_TYPES)).toEqual([]);
  });

  it("prefers a name match over a description-only match", () => {
    const ranked = scoreNodeTypes("template", FIXTURE_NODE_TYPES);
    expect(ranked[0].nodeType.type).toBe("var-string-template");
  });
});

describe("findSimilarTypes", () => {
  it("suggests real types for a hallucinated one", () => {
    expect(
      findSimilarTypes("text-inputs-node", FIXTURE_NODE_TYPES, 3)
    ).toContain("text-input");
  });

  it("returns nothing when there is no shared token", () => {
    expect(findSimilarTypes("zzz", FIXTURE_NODE_TYPES, 3)).toEqual([]);
  });
});
