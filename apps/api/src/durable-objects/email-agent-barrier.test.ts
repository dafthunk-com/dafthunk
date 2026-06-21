import { describe, expect, it } from "vitest";

import {
  allSettled,
  nextWaitingDeadline,
  type PendingAsk,
  settleExpired,
  settleReply,
  toResumeResults,
} from "./email-agent-barrier";

const SENTINEL = "(no reply received)";

function ask(overrides: Partial<PendingAsk>): PendingAsk {
  return {
    toolCallId: "tc",
    interlocutorId: "alice",
    threadId: "t1",
    deadline: 1000,
    status: "waiting",
    ...overrides,
  };
}

describe("email-agent-barrier", () => {
  describe("settleReply", () => {
    it("settles the waiting ask on a matching thread", () => {
      const pending = [
        ask({ toolCallId: "a", threadId: "t1" }),
        ask({ toolCallId: "b", threadId: "t2" }),
      ];
      expect(settleReply(pending, "t1", "hello")).toBe(true);
      expect(pending[0]).toMatchObject({ status: "settled", result: "hello" });
      expect(pending[1].status).toBe("waiting");
    });

    it("returns false when no waiting ask owns the thread", () => {
      const pending = [ask({ threadId: "t1", status: "settled" })];
      expect(settleReply(pending, "t1", "x")).toBe(false);
      expect(settleReply(pending, "tX", "x")).toBe(false);
    });
  });

  describe("settleExpired", () => {
    it("settles only waiting asks past their deadline with the sentinel", () => {
      const pending = [
        ask({ toolCallId: "a", deadline: 500 }),
        ask({ toolCallId: "b", deadline: 5000 }),
        ask({ toolCallId: "c", deadline: 100, status: "settled", result: "r" }),
      ];
      const expired = settleExpired(pending, 1000, SENTINEL);
      expect(expired.map((p) => p.toolCallId)).toEqual(["a"]);
      expect(pending[0]).toMatchObject({ status: "settled", result: SENTINEL });
      expect(pending[1].status).toBe("waiting");
      expect(pending[2].result).toBe("r"); // untouched
    });
  });

  describe("allSettled / nextWaitingDeadline", () => {
    it("reports completion and the earliest remaining deadline", () => {
      const pending = [
        ask({ deadline: 3000, status: "settled" }),
        ask({ deadline: 2000 }),
        ask({ deadline: 4000 }),
      ];
      expect(allSettled(pending)).toBe(false);
      expect(nextWaitingDeadline(pending)).toBe(2000);

      pending[1].status = "settled";
      pending[2].status = "settled";
      expect(allSettled(pending)).toBe(true);
      expect(nextWaitingDeadline(pending)).toBeUndefined();
    });
  });

  describe("toResumeResults", () => {
    it("maps every ask in order, using the sentinel when unanswered", () => {
      const pending = [
        ask({ toolCallId: "a", status: "settled", result: "reply-a" }),
        ask({ toolCallId: "b", status: "settled" }), // no result
      ];
      expect(toResumeResults(pending, "ask_interlocutor", SENTINEL)).toEqual([
        { toolCallId: "a", toolName: "ask_interlocutor", content: "reply-a" },
        { toolCallId: "b", toolName: "ask_interlocutor", content: SENTINEL },
      ]);
    });
  });
});
