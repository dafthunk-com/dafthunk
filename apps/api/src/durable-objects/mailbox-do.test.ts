import { env } from "cloudflare:test";
import { v7 as uuidv7 } from "uuid";
import { beforeEach, describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import type { IngestInboundArgs } from "./mailbox-do";

const bindings = env as Bindings;
const EMAIL_ID = "email-1";

// Each test gets its own DO instance (own SQLite) via a unique name.
function freshMailbox() {
  const name = `mailbox:test-${uuidv7()}`;
  return bindings.MAILBOX.get(bindings.MAILBOX.idFromName(name));
}

function inbound(
  overrides: Partial<IngestInboundArgs> = {}
): IngestInboundArgs {
  const messageId = uuidv7();
  return {
    emailId: EMAIL_ID,
    messageId,
    fromEmail: "sender@example.com",
    fromName: "Sender",
    toEmail: "bot@mail.dafthunk.com",
    subject: "Hello there",
    rfc822MessageId: `<${messageId}@example.com>`,
    inReplyTo: null,
    references: [],
    referencesChain: null,
    snippet: "Hi",
    hasHtml: false,
    hasText: true,
    rawR2Key: `${EMAIL_ID}/${messageId}/raw.eml`,
    attachments: [],
    verifiedThreadId: null,
    ...overrides,
  };
}

describe("MailboxDO", () => {
  let mailbox: ReturnType<typeof freshMailbox>;

  beforeEach(() => {
    mailbox = freshMailbox();
  });

  it("creates a thread and stores the inbound message", async () => {
    const args = inbound();
    const { threadId, messageId } = await mailbox.ingestInbound(args);

    expect(threadId).toBeTruthy();
    expect(messageId).toBe(args.messageId);

    const messages = await mailbox.listThreadMessages(threadId);
    expect(messages).toHaveLength(1);
    expect(messages[0].direction).toBe("inbound");
    expect(messages[0].fromEmail).toBe("sender@example.com");

    const thread = await mailbox.getThread(threadId);
    expect(thread?.subject).toBe("Hello there");
  });

  it("threads a reply by In-Reply-To onto the same thread", async () => {
    const first = inbound();
    const { threadId } = await mailbox.ingestInbound(first);

    const reply = inbound({
      subject: "Re: Hello there",
      inReplyTo: first.rfc822MessageId,
    });
    const second = await mailbox.ingestInbound(reply);

    expect(second.threadId).toBe(threadId);
    const messages = await mailbox.listThreadMessages(threadId);
    expect(messages).toHaveLength(2);
  });

  it("threads a reply by normalized subject + sender when headers are missing", async () => {
    const first = inbound();
    const { threadId } = await mailbox.ingestInbound(first);

    // No In-Reply-To/References; relies on subject + fromEmail fallback.
    const reply = inbound({ subject: "RE: Hello there" });
    const second = await mailbox.ingestInbound(reply);

    expect(second.threadId).toBe(threadId);
  });

  it("starts a new thread for an unrelated subject", async () => {
    const first = inbound();
    const { threadId } = await mailbox.ingestInbound(first);

    const other = inbound({ subject: "A completely different topic" });
    const second = await mailbox.ingestInbound(other);

    expect(second.threadId).not.toBe(threadId);
  });

  it("does not cross threads between different addresses", async () => {
    const a = inbound({ emailId: "email-A" });
    const { threadId: threadA } = await mailbox.ingestInbound(a);

    // Same subject + sender but a different address must not thread together.
    const b = inbound({ emailId: "email-B", subject: "Re: Hello there" });
    const { threadId: threadB } = await mailbox.ingestInbound(b);

    expect(threadB).not.toBe(threadA);
  });

  it("honors a verified reply-token thread id", async () => {
    const first = inbound();
    const { threadId } = await mailbox.ingestInbound(first);

    // Spoofed From + unrelated subject, but a verified token wins.
    const tokenReply = inbound({
      fromEmail: "attacker@evil.example",
      subject: "totally unrelated",
      verifiedThreadId: threadId,
    });
    const second = await mailbox.ingestInbound(tokenReply);
    expect(second.threadId).toBe(threadId);
  });

  it("inserts and rolls back an outbound message", async () => {
    const { threadId } = await mailbox.ingestInbound(inbound());

    const messageId = uuidv7();
    await mailbox.insertOutbound({
      emailId: EMAIL_ID,
      threadId,
      messageId,
      fromEmail: "bot@mail.dafthunk.com",
      toEmail: "sender@example.com",
      subject: "Re: Hello there",
      rfc822MessageId: `<${messageId}@mail.dafthunk.com>`,
      inReplyTo: null,
      referencesChain: null,
      snippet: "reply",
      hasHtml: false,
      hasText: true,
      rawR2Key: `${EMAIL_ID}/${messageId}/raw.eml`,
    });

    let messages = await mailbox.listThreadMessages(threadId);
    expect(messages).toHaveLength(2);
    expect(messages[1].direction).toBe("outbound");

    await mailbox.deleteMessage(messageId);
    messages = await mailbox.listThreadMessages(threadId);
    expect(messages).toHaveLength(1);
  });

  it("prunes inactive threads and reports their R2 prefixes", async () => {
    const args = inbound();
    const { threadId, messageId } = await mailbox.ingestInbound(args);

    // Nothing inactive before the beginning of time.
    const noop = await mailbox.pruneInactiveThreads(0);
    expect(noop.r2Prefixes).toHaveLength(0);
    expect(await mailbox.getThread(threadId)).toBeDefined();

    // Everything is inactive relative to a far-future cutoff.
    const pruned = await mailbox.pruneInactiveThreads(Date.now() + 60_000);
    expect(pruned.r2Prefixes).toContain(`${args.emailId}/${messageId}`);
    expect(await mailbox.getThread(threadId)).toBeUndefined();
    expect(await mailbox.listThreadMessages(threadId)).toHaveLength(0);
  });
});
