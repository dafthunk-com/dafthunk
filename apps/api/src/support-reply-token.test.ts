import { describe, expect, it } from "vitest";

import {
  mintReplyToken,
  REPLY_TOKEN_LENGTH,
  verifyReplyToken,
} from "./support-reply-token";

const SECRET = "test-jwt-secret-please-do-not-use-in-production";
const SAMPLE_THREAD_ID = "0190d8a0-1d6e-7000-8000-000000000001";

describe("support reply token", () => {
  it("round-trips a thread id", async () => {
    const token = await mintReplyToken(SAMPLE_THREAD_ID, SECRET);
    expect(token).toHaveLength(REPLY_TOKEN_LENGTH);
    expect(token).toMatch(/^[a-z2-7]+$/);
    expect(await verifyReplyToken(token, SECRET)).toBe(SAMPLE_THREAD_ID);
  });

  it("is deterministic for a given (threadId, secret)", async () => {
    const a = await mintReplyToken(SAMPLE_THREAD_ID, SECRET);
    const b = await mintReplyToken(SAMPLE_THREAD_ID, SECRET);
    expect(a).toBe(b);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await mintReplyToken(SAMPLE_THREAD_ID, SECRET);
    expect(await verifyReplyToken(token, "wrong-secret")).toBeNull();
  });

  it("rejects a tampered MAC", async () => {
    const token = await mintReplyToken(SAMPLE_THREAD_ID, SECRET);
    // Flip the last char to something else in the base32 alphabet.
    const last = token[token.length - 1];
    const replacement = last === "a" ? "b" : "a";
    const tampered = token.slice(0, -1) + replacement;
    expect(await verifyReplyToken(tampered, SECRET)).toBeNull();
  });

  it("rejects a tampered thread-id portion", async () => {
    const token = await mintReplyToken(SAMPLE_THREAD_ID, SECRET);
    const replacement = token[0] === "a" ? "b" : "a";
    const tampered = replacement + token.slice(1);
    expect(await verifyReplyToken(tampered, SECRET)).toBeNull();
  });

  it("rejects tokens with the wrong length", async () => {
    expect(await verifyReplyToken("", SECRET)).toBeNull();
    expect(await verifyReplyToken("a".repeat(10), SECRET)).toBeNull();
    expect(
      await verifyReplyToken("a".repeat(REPLY_TOKEN_LENGTH - 1), SECRET)
    ).toBeNull();
    expect(
      await verifyReplyToken("a".repeat(REPLY_TOKEN_LENGTH + 1), SECRET)
    ).toBeNull();
  });

  it("rejects tokens containing non-base32 characters", async () => {
    const token = await mintReplyToken(SAMPLE_THREAD_ID, SECRET);
    const bad = "1" + token.slice(1); // '1' is not in the RFC 4648 alphabet
    expect(await verifyReplyToken(bad, SECRET)).toBeNull();
  });

  it("accepts uppercase input (relays may case-fold local parts)", async () => {
    const token = await mintReplyToken(SAMPLE_THREAD_ID, SECRET);
    expect(await verifyReplyToken(token.toUpperCase(), SECRET)).toBe(
      SAMPLE_THREAD_ID
    );
  });

  it("produces distinct tokens for distinct thread ids", async () => {
    const a = await mintReplyToken(SAMPLE_THREAD_ID, SECRET);
    const b = await mintReplyToken(
      "0190d8a0-1d6e-7000-8000-000000000002",
      SECRET
    );
    expect(a).not.toBe(b);
  });
});
