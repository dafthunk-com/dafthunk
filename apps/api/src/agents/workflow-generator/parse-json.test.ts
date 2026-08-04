import { describe, expect, it } from "vitest";

import { parseJsonObject } from "./parse-json";

describe("parseJsonObject", () => {
  it("reads a bare object", () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("reads one inside a fence", () => {
    expect(parseJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("ignores a preamble", () => {
    expect(parseJsonObject('Here you go:\n{"a":1}')).toEqual({ a: 1 });
  });

  it("ignores a trailing sentence", () => {
    expect(parseJsonObject('{"a":1}\nHope that helps!')).toEqual({ a: 1 });
  });

  it("keeps a nested object that ends the document", () => {
    // The brace-slicing fallback must not fire when the whole thing parses —
    // it would be a no-op here, but on truncated input it is actively harmful.
    expect(parseJsonObject('{"a":{"b":2}}')).toEqual({ a: { b: 2 } });
  });

  it("says a cut-off answer was cut off", () => {
    // This is the real-world failure: the model stopped mid-array. Slicing to
    // the last `}` used to yield `{"nodes":[{"id":"a"}` + `}`, which JSON.parse
    // reports as a syntax error at a position that means nothing to anyone.
    const truncated = '{"title":"x","nodes":[{"id":"a"},{"id":"b"},{"id":"c';

    expect(() => parseJsonObject(truncated)).toThrow(/cut off/);
    expect(() => parseJsonObject(truncated)).not.toThrow(/position/);
  });

  it("still calls genuinely malformed input malformed", () => {
    expect(() => parseJsonObject('{"a":1,,}')).toThrow(/not valid JSON/);
  });

  it("reports an answer with no object at all", () => {
    expect(() => parseJsonObject("I cannot help with that.")).toThrow(
      /no JSON object/
    );
  });
});
