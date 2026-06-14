import type {
  MailboxService,
  MailboxThreadMessage,
  NodeContext,
} from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { GetEmailThreadNode } from "./get-email-thread-node";

function makeNode() {
  return new GetEmailThreadNode({
    nodeId: "get-email-thread",
  } as unknown as Node);
}

const sampleMessages: MailboxThreadMessage[] = [
  {
    id: "m1",
    direction: "inbound",
    fromEmail: "user@example.com",
    toEmail: "bot@mail.dafthunk.com",
    subject: "Hello",
    snippet: "Hi there",
    rfc822MessageId: "<m1@example.com>",
    inReplyTo: null,
    referencesChain: null,
    hasHtml: false,
    hasText: true,
    attachmentCount: 0,
    createdAt: 1,
  },
];

describe("GetEmailThreadNode", () => {
  it("returns the thread messages for the triggering email", async () => {
    const mailboxService = {
      sendThreaded: vi.fn(),
      getThread: vi.fn().mockResolvedValue({ subject: "Hello" }),
      listThreadMessages: vi.fn().mockResolvedValue(sampleMessages),
    } as unknown as MailboxService;

    const context = {
      nodeId: "get-email-thread",
      organizationId: "org-1",
      inputs: {},
      mailboxService,
      emailMessage: {
        from: "user@example.com",
        to: "bot@mail.dafthunk.com",
        raw: "",
        threadId: "thread-1",
        headers: {},
      },
      env: {},
      getIntegration: async () => {
        throw new Error("no integrations");
      },
    } as unknown as NodeContext;

    const result = await makeNode().execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.count).toBe(1);
    expect(result.outputs?.subject).toBe("Hello");
    expect(mailboxService.listThreadMessages).toHaveBeenCalledWith(
      "thread-1",
      "org-1"
    );
  });

  it("uses an explicit threadId input over the trigger", async () => {
    const mailboxService = {
      sendThreaded: vi.fn(),
      getThread: vi.fn().mockResolvedValue({ subject: "Other" }),
      listThreadMessages: vi.fn().mockResolvedValue([]),
    } as unknown as MailboxService;

    const context = {
      nodeId: "get-email-thread",
      organizationId: "org-1",
      inputs: { threadId: "explicit-thread" },
      mailboxService,
      env: {},
      getIntegration: async () => {
        throw new Error("no integrations");
      },
    } as unknown as NodeContext;

    const result = await makeNode().execute(context);
    expect(result.status).toBe("completed");
    expect(mailboxService.listThreadMessages).toHaveBeenCalledWith(
      "explicit-thread",
      "org-1"
    );
  });

  it("errors when no thread id is available", async () => {
    const context = {
      nodeId: "get-email-thread",
      organizationId: "org-1",
      inputs: {},
      mailboxService: {
        sendThreaded: vi.fn(),
        getThread: vi.fn(),
        listThreadMessages: vi.fn(),
      } as unknown as MailboxService,
      env: {},
      getIntegration: async () => {
        throw new Error("no integrations");
      },
    } as unknown as NodeContext;

    const result = await makeNode().execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No thread id");
  });

  it("errors when the mailbox service is unavailable", async () => {
    const context = {
      nodeId: "get-email-thread",
      organizationId: "org-1",
      inputs: { threadId: "t1" },
      env: {},
      getIntegration: async () => {
        throw new Error("no integrations");
      },
    } as unknown as NodeContext;

    const result = await makeNode().execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Mailbox service");
  });
});
