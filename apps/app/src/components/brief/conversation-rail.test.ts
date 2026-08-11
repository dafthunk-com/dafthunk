import { describe, expect, it } from "vitest";

import type { BriefState } from "@/hooks/use-workflow-brief";
import { railScreen } from "./conversation-rail";

/**
 * The branch order, pinned. Two pages render these screens; this table is
 * what keeps them from ever disagreeing about which state means what.
 */

function state(overrides: Partial<BriefState> = {}): BriefState {
  return {
    status: "idle",
    sessionLoaded: true,
    replayed: false,
    turn: 0,
    notes: [],
    phaseTrail: [],
    connection: "connected",
    cancelling: false,
    ...overrides,
  };
}

describe("railScreen", () => {
  it("hands the front door to the page", () => {
    expect(railScreen(state())).toBe("front-door");
  });

  it("hands suggestions to the page", () => {
    expect(
      railScreen(state({ status: "awaiting", suggestions: ["a", "b"] }))
    ).toBe("suggestions");
  });

  it("hands the brief readback to the page", () => {
    expect(
      railScreen(
        state({
          status: "awaiting",
          brief: { blanks: [] } as unknown as BriefState["brief"],
        })
      )
    ).toBe("brief");
  });

  it("lost-midflight beats everything", () => {
    expect(
      railScreen(
        state({
          status: "running",
          connection: "lost",
          pendingActions: [{}] as BriefState["pendingActions"],
        })
      )
    ).toBe("lost");
  });

  it("a settled lost connection is a banner, not a screen", () => {
    expect(
      railScreen(state({ status: "done", connection: "lost", replayed: true }))
    ).toBe("outcome");
  });

  it("the approval gate beats the brief readback", () => {
    // A held run is also `awaiting` and still has a brief attached — the
    // brief screen would otherwise win and the question would never be asked.
    expect(
      railScreen(
        state({
          status: "awaiting",
          brief: { blanks: [] } as unknown as BriefState["brief"],
          pendingActions: [{}] as BriefState["pendingActions"],
        })
      )
    ).toBe("approval");
  });

  it("running", () => {
    expect(railScreen(state({ status: "running" }))).toBe("running");
  });

  it("a cancel that saved nothing is its own screen", () => {
    expect(
      railScreen(
        state({
          status: "failed",
          error: { message: "", recoverable: true, code: "CANCELLED" },
        })
      )
    ).toBe("cancelled");
  });

  it("a cancel that saved something but never ran lands on failed", () => {
    // Parity with the page this was extracted from: the outcome's
    // "Stopped, as asked" copy only renders once an execution exists.
    expect(
      railScreen(
        state({
          status: "failed",
          workflowId: "wf-1",
          replayed: true,
          error: { message: "", recoverable: true, code: "CANCELLED" },
        })
      )
    ).toBe("failed");
  });

  it("hands the settled-without-replay pointer screen to the page", () => {
    expect(
      railScreen(state({ status: "done", workflowId: "wf-1", replayed: false }))
    ).toBe("pointer");
    expect(
      railScreen(
        state({ status: "failed", workflowId: "wf-1", replayed: false })
      )
    ).toBe("pointer");
  });

  it("failed without an execution", () => {
    expect(
      railScreen(
        state({
          status: "failed",
          replayed: true,
          error: { message: "boom", recoverable: true },
        })
      )
    ).toBe("failed");
  });

  it("failed with an execution is a partial outcome", () => {
    expect(
      railScreen(
        state({
          status: "failed",
          replayed: true,
          workflowId: "wf-1",
          execution: {} as BriefState["execution"],
        })
      )
    ).toBe("outcome");
  });

  it("done with a replay is the outcome", () => {
    expect(
      railScreen(state({ status: "done", workflowId: "wf-1", replayed: true }))
    ).toBe("outcome");
  });
});
