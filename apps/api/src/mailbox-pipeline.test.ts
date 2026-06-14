/**
 * Integration test for the inbound mailbox pipeline: real MIME parsing
 * (PostalMime) + real R2 (INBOXES) staging feeding the MailboxDO, mirroring
 * what `handleIncomingEmail` does after the D1 address lookup. The D1 lookup +
 * trigger dispatch are thin glue and are intentionally not covered here (the
 * test pool has no D1 migration/seeding infrastructure).
 */

import { env } from "cloudflare:test";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Bindings } from "./context";
import { parseAndStageEmail } from "./mailbox-staging";

const bindings = env as Bindings;
const EMAIL_ID = "email-staging";

function freshMailbox() {
  return bindings.MAILBOX.get(
    bindings.MAILBOX.idFromName(`mailbox:test-${uuidv7()}`)
  );
}

function rawEmail(opts: {
  from: string;
  to: string;
  subject: string;
  messageId: string;
  body: string;
  inReplyTo?: string;
}): Uint8Array {
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `Message-ID: ${opts.messageId}`,
    ...(opts.inReplyTo ? [`In-Reply-To: ${opts.inReplyTo}`] : []),
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
  ];
  return new TextEncoder().encode(
    `${headers.join("\r\n")}\r\n\r\n${opts.body}`
  );
}

describe("mailbox inbound pipeline (staging + DO)", () => {
  it("parses real MIME, stages to R2, and indexes the message in the DO", async () => {
    const mailbox = freshMailbox();
    const messageId = uuidv7();
    const rfcId = "<first@example.com>";
    const bytes = rawEmail({
      from: "Alice <alice@example.com>",
      to: "bot@mail.dafthunk.com",
      subject: "Need help with billing",
      messageId: rfcId,
      body: "Hi, I have a question.",
    });

    const staged = await parseAndStageEmail(
      bindings,
      bytes,
      EMAIL_ID,
      messageId,
      {
        from: "alice@example.com",
        to: "bot@mail.dafthunk.com",
      }
    );

    // Real parse extracted the right fields.
    expect(staged.fromEmail).toBe("alice@example.com");
    expect(staged.subject).toBe("Need help with billing");
    expect(staged.rfc822MessageId).toBe(rfcId);
    expect(staged.hasText).toBe(true);

    // Raw MIME really landed in R2.
    const stored = await bindings.INBOXES.get(staged.rawR2Key);
    expect(stored).not.toBeNull();

    // The DO indexed it into a thread.
    const { threadId } = await mailbox.ingestInbound({
      emailId: EMAIL_ID,
      messageId,
      ...staged,
      verifiedThreadId: null,
    });
    const messages = await mailbox.listThreadMessages(threadId);
    expect(messages).toHaveLength(1);
    expect(messages[0].snippet).toContain("I have a question");
  });

  it("threads a real reply (In-Reply-To) onto the same conversation", async () => {
    const mailbox = freshMailbox();

    const firstId = uuidv7();
    const firstRfc = "<root@example.com>";
    const first = await parseAndStageEmail(
      bindings,
      rawEmail({
        from: "alice@example.com",
        to: "bot@mail.dafthunk.com",
        subject: "Question",
        messageId: firstRfc,
        body: "First message",
      }),
      EMAIL_ID,
      firstId,
      { from: "alice@example.com", to: "bot@mail.dafthunk.com" }
    );
    const { threadId } = await mailbox.ingestInbound({
      emailId: EMAIL_ID,
      messageId: firstId,
      ...first,
      verifiedThreadId: null,
    });

    const replyId = uuidv7();
    const reply = await parseAndStageEmail(
      bindings,
      rawEmail({
        from: "alice@example.com",
        to: "bot@mail.dafthunk.com",
        subject: "Re: Question",
        messageId: "<reply@example.com>",
        inReplyTo: firstRfc,
        body: "A follow-up",
      }),
      EMAIL_ID,
      replyId,
      { from: "alice@example.com", to: "bot@mail.dafthunk.com" }
    );
    const second = await mailbox.ingestInbound({
      emailId: EMAIL_ID,
      messageId: replyId,
      ...reply,
      verifiedThreadId: null,
    });

    expect(second.threadId).toBe(threadId);
    expect(await mailbox.listThreadMessages(threadId)).toHaveLength(2);
  });
});
