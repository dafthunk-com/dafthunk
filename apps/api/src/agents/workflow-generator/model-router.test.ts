import { describe, expect, it } from "vitest";

import { GENERATOR_MODELS } from "./config";
import { parseModelOverride, resolveTier } from "./model-router";

/**
 * The parser is deliberately forgiving, which makes it worth pinning.
 *
 * It reads an operator-supplied binding and answers "no override" to anything
 * it cannot use, rather than throwing — so a typo runs the suite against the
 * configured model instead of failing it. That is the right trade for a harness
 * option, and it is also exactly how a sweep could silently measure the wrong
 * thing, which is why both harnesses print the resolved model before the first
 * call.
 */
describe("parseModelOverride", () => {
  it("reads provider:model", () => {
    expect(parseModelOverride("anthropic:claude-opus-5")).toEqual({
      synthesis: { provider: "anthropic", model: "claude-opus-5" },
    });
  });

  it("keeps colons that belong to the model name", () => {
    // Workers AI model ids carry slashes and the Gateway ones can carry colons;
    // splitting on the last separator would silently truncate them.
    expect(parseModelOverride("workers-ai:@cf/meta/llama-3.3:70b")).toEqual({
      synthesis: { provider: "workers-ai", model: "@cf/meta/llama-3.3:70b" },
    });
  });

  it("overrides synthesis only", () => {
    // The brief tier is a different shape of work — short, schema-bound, with a
    // person waiting on it. Sweeping it is a separate experiment.
    const overrides = parseModelOverride("google:gemini-2-5-pro");
    expect(overrides?.fast).toBeUndefined();
  });

  // Annotated so the tuples share one type; inferred, `undefined` makes its own
  // arm of a union and the callback stops matching either.
  const REJECTED: Array<[string | undefined, string]> = [
    ["", "unset"],
    [undefined, "absent"],
    ["claude-opus-5", "no provider"],
    [":claude-opus-5", "empty provider"],
    ["anthropic:", "empty model"],
    ["nosuchprovider:model", "unknown provider"],
  ];

  it.each(REJECTED)("ignores %j (%s)", (raw) => {
    expect(parseModelOverride(raw)).toBeUndefined();
  });
});

describe("resolveTier", () => {
  it("falls back to what config declares", () => {
    expect(resolveTier("synthesis")).toEqual({
      provider: GENERATOR_MODELS.synthesis.provider,
      model: GENERATOR_MODELS.synthesis.model,
    });
  });

  it("prefers an override when there is one", () => {
    const overrides = parseModelOverride("openai:gpt-5");
    expect(resolveTier("synthesis", overrides)).toEqual({
      provider: "openai",
      model: "gpt-5",
    });
    // And leaves the tier it was not asked about alone.
    expect(resolveTier("fast", overrides)).toEqual({
      provider: GENERATOR_MODELS.fast.provider,
      model: GENERATOR_MODELS.fast.model,
    });
  });
});
