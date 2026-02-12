import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ParseEmailNode } from "./parse-email-node";

describe("ParseEmailNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "parse-email",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should parse basic email content", async () => {
    const node = new ParseEmailNode({
      nodeId: "parse-email",
    } as unknown as Node);

    const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Test Email
Content-Type: text/plain

This is the email body.`;

    const context = createContext({ raw: rawEmail });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.subject).toBe("Test Subject");
    expect(result.outputs?.text).toBe("Test plain text content");
    expect(result.outputs?.html).toBe("<p>Test HTML content</p>");
    expect(result.outputs?.from).toBeDefined();
    expect(result.outputs?.to).toBeDefined();
    expect(Array.isArray(result.outputs?.from)).toBe(true);
    expect(Array.isArray(result.outputs?.to)).toBe(true);
    expect(result.outputs?.from[0].address).toBe("sender@example.com");
    expect(result.outputs?.to[0].address).toBe("recipient@example.com");
  });

  it("should parse email with HTML content", async () => {
    const nodeId = "parse-email";
    const node = new ParseEmailNode({
      nodeId,
    } as unknown as Node);

    const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: HTML Email
Content-Type: text/html

<html><body><h1>Hello</h1><p>This is HTML content.</p></body></html>`;

    const context = {
      nodeId,
      inputs: {
        raw: rawEmail,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.html).toBe("<p>Test HTML content</p>");
    expect(result.outputs?.text).toBe("Test plain text content");
  });

  it("should parse email with multiple recipients", async () => {
    const nodeId = "parse-email";
    const node = new ParseEmailNode({
      nodeId,
    } as unknown as Node);

    const rawEmail = `From: sender@example.com
To: recipient1@example.com, recipient2@example.com
CC: cc@example.com
Subject: Multiple Recipients

Email body.`;

    const context = {
      nodeId,
      inputs: {
        raw: rawEmail,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.to).toBeDefined();
    expect(Array.isArray(result.outputs?.to)).toBe(true);
    expect(result.outputs?.to.length).toBe(1);
    expect(result.outputs?.to[0].address).toBe("recipient@example.com");
    expect(result.outputs?.cc).toBeDefined();
    expect(Array.isArray(result.outputs?.cc)).toBe(true);
  });

  it("should handle missing raw email content", async () => {
    const node = new ParseEmailNode({
      nodeId: "parse-email",
    } as unknown as Node);

    const result = await node.execute(createContext({}));
    expect(result.status).toBe("error");
    expect(result.error).toContain("required");
  });

  it("should return error for invalid input type", async () => {
    const node = new ParseEmailNode({
      nodeId: "parse-email",
    } as unknown as Node);

    const result = await node.execute(createContext({ raw: 123 }));
    expect(result.status).toBe("error");
    expect(result.error).toContain("required");
  });

  it("should handle empty raw email content", async () => {
    const node = new ParseEmailNode({
      nodeId: "parse-email",
    } as unknown as Node);

    const result = await node.execute(createContext({ raw: "" }));
    expect(result.status).toBe("completed");
    expect(result.outputs?.subject).toBe("Test Subject");
    expect(result.outputs?.text).toBe("Test plain text content");
    expect(result.outputs?.html).toBe("<p>Test HTML content</p>");
  });

  it("should parse email with complex headers", async () => {
    const nodeId = "parse-email";
    const node = new ParseEmailNode({
      nodeId,
    } as unknown as Node);

    const rawEmail = `From: "John Doe" <john.doe@example.com>
To: "Jane Smith" <jane.smith@example.com>
Reply-To: noreply@example.com
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <123456@example.com>
Subject: Complex Email Headers

This email has complex headers.`;

    const context = {
      nodeId,
      inputs: {
        raw: rawEmail,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.subject).toBe("Test Subject");
    expect(result.outputs?.from).toBeDefined();
    expect(Array.isArray(result.outputs?.from)).toBe(true);
    expect(result.outputs?.from[0]).toHaveProperty("address");
    expect(result.outputs?.from[0]).toHaveProperty("name");
    expect(result.outputs?.from[0].address).toBe("sender@example.com");
    expect(result.outputs?.from[0].name).toBe("Test Sender");
  });

  it("should handle email with BCC recipients", async () => {
    const nodeId = "parse-email";
    const node = new ParseEmailNode({
      nodeId,
    } as unknown as Node);

    const rawEmail = `From: sender@example.com
To: recipient@example.com
BCC: bcc1@example.com, bcc2@example.com
Subject: BCC Test

Email with BCC recipients.`;

    const context = {
      nodeId,
      inputs: {
        raw: rawEmail,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.bcc).toBeDefined();
    expect(Array.isArray(result.outputs?.bcc)).toBe(true);
  });

  it("should parse email with message ID and in-reply-to", async () => {
    const nodeId = "parse-email";
    const node = new ParseEmailNode({
      nodeId,
    } as unknown as Node);

    const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Reply Test
Message-ID: <msg123@example.com>
In-Reply-To: <original123@example.com>
References: <original123@example.com>

This is a reply.`;

    const context = {
      nodeId,
      inputs: {
        raw: rawEmail,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.messageId).toBe("<test-message-id@example.com>");
    expect(result.outputs?.inReplyTo).toBe("");
    expect(result.outputs?.date).toBe("2024-01-01T00:00:00.000Z");
    expect(result.outputs?.priority).toBe("normal");
  });
});
