import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { findHttpTrigger } from "./http-triggers";

/**
 * `findHttpTrigger` is the logic that replaces the old endpoint lookup: it
 * derives sync-vs-async runtime straight from the trigger node type, so the URL
 * only needs the workflow id. (The full request path queries D1/R2 and is
 * exercised by manual verification — the test pool D1 has no schema.)
 */
const node = (type: string): Node =>
  ({ id: type, type, name: type, inputs: [], outputs: [] }) as unknown as Node;

describe("findHttpTrigger", () => {
  it("maps http-request to the synchronous worker runtime", () => {
    expect(findHttpTrigger([node("http-request")])).toBe("worker");
  });

  it("maps http-webhook to the asynchronous workflow runtime", () => {
    expect(findHttpTrigger([node("http-webhook")])).toBe("workflow");
  });

  it("finds the trigger among other nodes", () => {
    const nodes = [node("text"), node("http-webhook"), node("http-response")];
    expect(findHttpTrigger(nodes)).toBe("workflow");
  });

  it("returns null when there is no HTTP trigger node", () => {
    expect(findHttpTrigger([node("text"), node("http-response")])).toBeNull();
  });

  it("returns null for an empty graph", () => {
    expect(findHttpTrigger([])).toBeNull();
  });
});
