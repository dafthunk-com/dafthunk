/**
 * Pure barrier bookkeeping for EmailAgentRunner.
 *
 * A fan-out of `ask_interlocutor` calls parks the agent loop until every ask is
 * settled — answered by a reply or expired by its deadline. These helpers own
 * that settlement math so it can be reasoned about and tested without the
 * Durable Object's bindings.
 */

import type { ResolvedToolResult } from "@dafthunk/runtime/utils/agent-loop";

export interface PendingAsk {
  toolCallId: string;
  interlocutorId: string;
  threadId: string;
  deadline: number;
  status: "waiting" | "settled";
  result?: string;
}

/**
 * Settle the first waiting ask on a thread with a reply. Returns true when an
 * ask matched (mutates it in place); false when no waiting ask owns the thread.
 */
export function settleReply(
  pending: PendingAsk[],
  threadId: string,
  text: string
): boolean {
  const ask = pending.find(
    (p) => p.threadId === threadId && p.status === "waiting"
  );
  if (!ask) return false;
  ask.status = "settled";
  ask.result = text;
  return true;
}

/**
 * Settle every waiting ask whose deadline has passed with a sentinel result.
 * Returns the asks that were just expired (mutated in place).
 */
export function settleExpired(
  pending: PendingAsk[],
  now: number,
  sentinel: string
): PendingAsk[] {
  const expired: PendingAsk[] = [];
  for (const p of pending) {
    if (p.status === "waiting" && p.deadline <= now) {
      p.status = "settled";
      p.result = sentinel;
      expired.push(p);
    }
  }
  return expired;
}

/** True when no ask is still waiting (the barrier is complete). */
export function allSettled(pending: PendingAsk[]): boolean {
  return pending.every((p) => p.status === "settled");
}

/** Earliest deadline among still-waiting asks, or undefined if none remain. */
export function nextWaitingDeadline(pending: PendingAsk[]): number | undefined {
  const deadlines = pending
    .filter((p) => p.status === "waiting")
    .map((p) => p.deadline);
  return deadlines.length > 0 ? Math.min(...deadlines) : undefined;
}

/**
 * Build the tool results that resume the suspended loop — one per ask, in the
 * original order, falling back to the sentinel for any without a recorded result.
 */
export function toResumeResults(
  pending: PendingAsk[],
  toolName: string,
  sentinel: string
): ResolvedToolResult[] {
  return pending.map((p) => ({
    toolCallId: p.toolCallId,
    toolName,
    content: p.result ?? sentinel,
  }));
}
