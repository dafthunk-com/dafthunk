import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ReceiveEmailNode } from "./receive-email-node";

describe("ReceiveEmailNode", () => {
  it("should extract email message data", async () => {
    const nodeId = "receive-email";
    const node = new ReceiveEmailNode({
      nodeId,
    } as unknown as Node);

    const mockEmailMessage = {
      from: "sender@example.com",
      to: "recipient@example.com",
      headers: {
        subject: "Test Email",
        "content-type": "text/plain",
        date: "Mon, 1 Jan 2024 12:00:00 +0000",
      },
      raw: "From: sender@example.com\nTo: recipient@example.com\nSubject: Test Email\n\nEmail body.",
    };

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
      emailMessage: mockEmailMessage,
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.from).toBe("sender@example.com");
    expect(result.outputs?.to).toBe("recipient@example.com");
    expect(result.outputs?.headers).toBeDefined();
    expect(result.outputs?.headers).toEqual(mockEmailMessage.headers);
    expect(result.outputs?.raw).toBe(mockEmailMessage.raw);
  });

  it("should handle email with complex headers", async () => {
    const nodeId = "receive-email";
    const node = new ReceiveEmailNode({
      nodeId,
    } as unknown as Node);

    const mockEmailMessage = {
      from: "sender@example.com",
      to: "recipient@example.com",
      headers: {
        subject: "Complex Email",
        "content-type": "text/html",
        date: "Mon, 1 Jan 2024 12:00:00 +0000",
        "message-id": "<123456@example.com>",
        "reply-to": "noreply@example.com",
        "x-custom-header": "custom-value",
      },
      raw: "From: sender@example.com\nTo: recipient@example.com\nSubject: Complex Email\n\nHTML email body.",
    };

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
      emailMessage: mockEmailMessage,
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.headers).toBeDefined();
    expect(result.outputs?.headers["message-id"]).toBe("<123456@example.com>");
    expect(result.outputs?.headers["x-custom-header"]).toBe("custom-value");
  });

  it("should handle email with multiple recipients", async () => {
    const nodeId = "receive-email";
    const node = new ReceiveEmailNode({
      nodeId,
    } as unknown as Node);

    const mockEmailMessage = {
      from: "sender@example.com",
      to: "recipient1@example.com, recipient2@example.com",
      headers: {
        subject: "Multiple Recipients",
        cc: "cc@example.com",
        bcc: "bcc@example.com",
      },
      raw: "From: sender@example.com\nTo: recipient1@example.com, recipient2@example.com\nSubject: Multiple Recipients\n\nEmail body.",
    };

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
      emailMessage: mockEmailMessage,
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.to).toBe(
      "recipient1@example.com, recipient2@example.com"
    );
    expect(result.outputs?.headers["cc"]).toBe("cc@example.com");
    expect(result.outputs?.headers["bcc"]).toBe("bcc@example.com");
  });

  it("should handle missing email message", async () => {
    const nodeId = "receive-email";
    const node = new ReceiveEmailNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
      // No emailMessage provided
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Email message information is required but not provided"
    );
  });

  it("should handle email with empty fields", async () => {
    const nodeId = "receive-email";
    const node = new ReceiveEmailNode({
      nodeId,
    } as unknown as Node);

    const mockEmailMessage = {
      from: "",
      to: "",
      headers: {},
      raw: "",
    };

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
      emailMessage: mockEmailMessage,
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.from).toBe("");
    expect(result.outputs?.to).toBe("");
    expect(result.outputs?.headers).toEqual({});
    expect(result.outputs?.raw).toBe("");
  });

  it("should handle email with special characters", async () => {
    const nodeId = "receive-email";
    const node = new ReceiveEmailNode({
      nodeId,
    } as unknown as Node);

    const mockEmailMessage = {
      from: "sender+tag@example.com",
      to: "recipient@example.com",
      headers: {
        subject: "Email with special chars: äöü & symbols",
        "content-type": "text/plain; charset=utf-8",
      },
      raw: "From: sender+tag@example.com\nTo: recipient@example.com\nSubject: Email with special chars: äöü & symbols\n\nEmail body with special chars: äöü & symbols.",
    };

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
      emailMessage: mockEmailMessage,
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.from).toBe("sender+tag@example.com");
    expect(result.outputs?.headers["subject"]).toBe(
      "Email with special chars: äöü & symbols"
    );
    expect(result.outputs?.raw).toContain("special chars: äöü & symbols");
  });

  it("should handle email with large content", async () => {
    const nodeId = "receive-email";
    const node = new ReceiveEmailNode({
      nodeId,
    } as unknown as Node);

    const largeBody = "A".repeat(10000); // 10KB body
    const mockEmailMessage = {
      from: "sender@example.com",
      to: "recipient@example.com",
      headers: {
        subject: "Large Email",
        "content-length": "10000",
      },
      raw: `From: sender@example.com\nTo: recipient@example.com\nSubject: Large Email\n\n${largeBody}`,
    };

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
      emailMessage: mockEmailMessage,
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.raw).toContain(largeBody);
    expect(result.outputs?.headers["content-length"]).toBe("10000");
  });

  it("should handle email with binary attachments", async () => {
    const nodeId = "receive-email";
    const node = new ReceiveEmailNode({
      nodeId,
    } as unknown as Node);

    const mockEmailMessage = {
      from: "sender@example.com",
      to: "recipient@example.com",
      headers: {
        subject: "Email with Attachments",
        "content-type": 'multipart/mixed; boundary="boundary"',
      },
      raw: `From: sender@example.com
To: recipient@example.com
Subject: Email with Attachments
Content-Type: multipart/mixed; boundary="boundary"

--boundary
Content-Type: text/plain

Email body.

--boundary
Content-Type: application/pdf
Content-Disposition: attachment; filename="document.pdf"

--boundary--`,
    };

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
      emailMessage: mockEmailMessage,
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.headers["content-type"]).toContain(
      "multipart/mixed"
    );
    expect(result.outputs?.raw).toContain("multipart/mixed");
  });
});
