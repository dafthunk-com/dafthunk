import { describe, expect, it } from "vitest";

import { parallelArticleCardTemplate as t } from "./parallel-article-card";
import { describeTemplateStructure } from "./template-test-utils";

describeTemplateStructure("Parallel Article Card template", t);

describe("Parallel Article Card template", () => {
  it("has no edges between the three parallel LLM nodes", () => {
    const parallelIds = new Set([
      "summarizer",
      "keyword-extractor",
      "title-generator",
    ]);
    for (const e of t.edges) {
      const sourceParallel = parallelIds.has(e.source);
      const targetParallel = parallelIds.has(e.target);
      expect(
        sourceParallel && targetParallel,
        `parallel branches must not depend on each other (${e.source} → ${e.target})`
      ).toBe(false);
    }
  });
});
