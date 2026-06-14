import type { MailboxService, NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { SendEmailNode } from "./send-email-node";

function makeNode() {
  return new SendEmailNode({ nodeId: "send-email" } as unknown as Node);
}

describe("SendEmailNode", () => {
  it("threads + persists via the mailbox service when in mailbox context", async () => {
    const sendThreaded = vi
      .fn<MailboxService["sendThreaded"]>()
      .mockResolvedValue({ messageId: "msg-123" });
    const mailboxService = {
      sendThreaded,
      getThread: vi.fn(),
      listThreadMessages: vi.fn(),
    } as unknown as MailboxService;

    const context = {
      nodeId: "send-email",
      organizationId: "org-1",
      inputs: {
        to: "user@example.com",
        subject: "Re: Hello",
        text: "Thanks!",
      },
      mailboxService,
      emailMessage: {
        from: "user@example.com",
        to: "bot@mail.dafthunk.com",
        raw: "",
        emailId: "email-1",
        threadId: "thread-1",
        headers: {
          "message-id": "<abc@example.com>",
          references: "<root@example.com> <abc@example.com>",
        },
      },
      env: {},
      getIntegration: async () => {
        throw new Error("no integrations");
      },
    } as unknown as NodeContext;

    const result = await makeNode().execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.messageId).toBe("msg-123");
    expect(sendThreaded).toHaveBeenCalledTimes(1);
    expect(sendThreaded).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        emailId: "email-1",
        to: "user@example.com",
        subject: "Re: Hello",
        text: "Thanks!",
        threadId: "thread-1",
        inReplyTo: "<abc@example.com>",
        references: ["<root@example.com>", "<abc@example.com>"],
      })
    );
  });

  it("falls back to a direct send when there is no mailbox context", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "direct-1" });
    const context = {
      nodeId: "send-email",
      organizationId: "org-1",
      inputs: {
        to: "user@example.com",
        subject: "Hello",
        text: "Hi",
      },
      env: {
        SEND_EMAIL: { send },
        SEND_EMAIL_FROM: "noreply@mail.dafthunk.com",
      },
      getIntegration: async () => {
        throw new Error("no integrations");
      },
    } as unknown as NodeContext;

    const result = await makeNode().execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.messageId).toBe("direct-1");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@mail.dafthunk.com",
        to: "user@example.com",
        subject: "Hello",
      })
    );
  });

  it("surfaces an error when the mailbox send fails", async () => {
    const mailboxService = {
      sendThreaded: vi.fn().mockRejectedValue(new Error("smtp down")),
      getThread: vi.fn(),
      listThreadMessages: vi.fn(),
    } as unknown as MailboxService;

    const context = {
      nodeId: "send-email",
      organizationId: "org-1",
      inputs: { to: "user@example.com", subject: "Re: Hello", text: "x" },
      mailboxService,
      emailMessage: {
        from: "user@example.com",
        to: "bot@mail.dafthunk.com",
        raw: "",
        emailId: "email-1",
        threadId: "thread-1",
        headers: {},
      },
      env: {},
      getIntegration: async () => {
        throw new Error("no integrations");
      },
    } as unknown as NodeContext;

    const result = await makeNode().execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("smtp down");
  });

  it("requires 'to' and 'subject'", async () => {
    const context = {
      nodeId: "send-email",
      organizationId: "org-1",
      inputs: { to: "user@example.com" },
      env: {},
      getIntegration: async () => {
        throw new Error("no integrations");
      },
    } as unknown as NodeContext;

    const result = await makeNode().execute(context);
    expect(result.status).toBe("error");
  });
});
