import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { ExtractEmailAttachmentsNode } from "./extract-email-attachments-node";

describe("ExtractEmailAttachmentsNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "extract-email-attachments",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should extract single attachment from email", async () => {
    const node = new ExtractEmailAttachmentsNode({
      nodeId: "extract-email-attachments",
    } as unknown as Node);

    const mailparser = await import("mailparser");
    const pdfContent = Buffer.from("Hello PDF content");
    vi.mocked(mailparser.simpleParser).mockResolvedValueOnce({
      subject: "Email with Attachment",
      text: "Email body with attachment.",
      html: "",
      from: { value: [{ address: "sender@example.com", name: "" }] },
      to: { value: [{ address: "recipient@example.com", name: "" }] },
      cc: null,
      bcc: null,
      replyTo: null,
      date: new Date("2024-01-01T00:00:00.000Z"),
      messageId: "",
      inReplyTo: null,
      references: [],
      priority: "normal",
      attachments: [
        {
          filename: "document.pdf",
          contentType: "application/pdf",
          contentDisposition: "attachment",
          contentId: "",
          size: pdfContent.length,
          content: pdfContent,
        },
      ],
    } as any);

    const result = await node.execute(createContext({ raw: "mock raw email" }));
    expect(result.status).toBe("completed");
    expect(result.outputs?.attachments).toBeDefined();
    expect(Array.isArray(result.outputs?.attachments)).toBe(true);
    expect(result.outputs?.attachments.length).toBe(1);
    expect(result.outputs?.attachments[0].filename).toBe("document.pdf");
    expect(result.outputs?.attachments[0].mimeType).toBe("application/pdf");
    expect(result.outputs?.attachments[0].data).toBeInstanceOf(Uint8Array);
  });

  it("should extract multiple attachments from email", async () => {
    const node = new ExtractEmailAttachmentsNode({
      nodeId: "extract-email-attachments",
    } as unknown as Node);

    const mailparser = await import("mailparser");
    const pdfContent = Buffer.from("PDF content");
    const imageContent = Buffer.from("Image content");
    vi.mocked(mailparser.simpleParser).mockResolvedValueOnce({
      subject: "Multiple Attachments",
      text: "Email with multiple attachments.",
      html: "",
      from: { value: [{ address: "sender@example.com", name: "" }] },
      to: { value: [{ address: "recipient@example.com", name: "" }] },
      cc: null,
      bcc: null,
      replyTo: null,
      date: new Date("2024-01-01T00:00:00.000Z"),
      messageId: "",
      inReplyTo: null,
      references: [],
      priority: "normal",
      attachments: [
        {
          filename: "report.pdf",
          contentType: "application/pdf",
          contentDisposition: "attachment",
          contentId: "",
          size: pdfContent.length,
          content: pdfContent,
        },
        {
          filename: "screenshot.png",
          contentType: "image/png",
          contentDisposition: "attachment",
          contentId: "",
          size: imageContent.length,
          content: imageContent,
        },
      ],
    } as any);

    const result = await node.execute(createContext({ raw: "mock raw email" }));
    expect(result.status).toBe("completed");
    expect(result.outputs?.attachments.length).toBe(2);
    expect(result.outputs?.attachments[0].filename).toBe("report.pdf");
    expect(result.outputs?.attachments[0].mimeType).toBe("application/pdf");
    expect(result.outputs?.attachments[0].data).toBeInstanceOf(Uint8Array);
    expect(result.outputs?.attachments[1].filename).toBe("screenshot.png");
    expect(result.outputs?.attachments[1].mimeType).toBe("image/png");
    expect(result.outputs?.attachments[1].data).toBeInstanceOf(Uint8Array);
  });

  it("should handle email without attachments", async () => {
    const node = new ExtractEmailAttachmentsNode({
      nodeId: "extract-email-attachments",
    } as unknown as Node);

    const result = await node.execute(createContext({ raw: "mock raw email" }));
    expect(result.status).toBe("completed");
    expect(result.outputs?.attachments).toEqual([]);
  });

  it("should handle attachment without filename", async () => {
    const node = new ExtractEmailAttachmentsNode({
      nodeId: "extract-email-attachments",
    } as unknown as Node);

    const mailparser = await import("mailparser");
    const content = Buffer.from("Binary content");
    vi.mocked(mailparser.simpleParser).mockResolvedValueOnce({
      subject: "Attachment without filename",
      text: "",
      html: "",
      from: { value: [{ address: "sender@example.com", name: "" }] },
      to: { value: [{ address: "recipient@example.com", name: "" }] },
      cc: null,
      bcc: null,
      replyTo: null,
      date: new Date("2024-01-01T00:00:00.000Z"),
      messageId: "",
      inReplyTo: null,
      references: [],
      priority: "normal",
      attachments: [
        {
          filename: undefined,
          contentType: "application/octet-stream",
          contentDisposition: "attachment",
          contentId: "",
          size: content.length,
          content: content,
        },
      ],
    } as any);

    const result = await node.execute(createContext({ raw: "mock raw email" }));
    expect(result.status).toBe("completed");
    expect(result.outputs?.attachments.length).toBe(1);
    expect(result.outputs?.attachments[0].filename).toBe("");
    expect(result.outputs?.attachments[0].mimeType).toBe(
      "application/octet-stream"
    );
  });

  it("should handle attachment without content type", async () => {
    const node = new ExtractEmailAttachmentsNode({
      nodeId: "extract-email-attachments",
    } as unknown as Node);

    const mailparser = await import("mailparser");
    const content = Buffer.from("Binary content");
    vi.mocked(mailparser.simpleParser).mockResolvedValueOnce({
      subject: "Attachment without content type",
      text: "",
      html: "",
      from: { value: [{ address: "sender@example.com", name: "" }] },
      to: { value: [{ address: "recipient@example.com", name: "" }] },
      cc: null,
      bcc: null,
      replyTo: null,
      date: new Date("2024-01-01T00:00:00.000Z"),
      messageId: "",
      inReplyTo: null,
      references: [],
      priority: "normal",
      attachments: [
        {
          filename: "unknown.bin",
          contentType: undefined,
          contentDisposition: "attachment",
          contentId: "",
          size: content.length,
          content: content,
        },
      ],
    } as any);

    const result = await node.execute(createContext({ raw: "mock raw email" }));
    expect(result.status).toBe("completed");
    expect(result.outputs?.attachments.length).toBe(1);
    expect(result.outputs?.attachments[0].filename).toBe("unknown.bin");
    expect(result.outputs?.attachments[0].mimeType).toBe(
      "application/octet-stream"
    );
  });

  it("should return error for missing raw email content", async () => {
    const node = new ExtractEmailAttachmentsNode({
      nodeId: "extract-email-attachments",
    } as unknown as Node);

    const result = await node.execute(createContext({}));
    expect(result.status).toBe("error");
    expect(result.error).toContain("required");
  });

  it("should return error for invalid input type", async () => {
    const node = new ExtractEmailAttachmentsNode({
      nodeId: "extract-email-attachments",
    } as unknown as Node);

    const result = await node.execute(createContext({ raw: 123 }));
    expect(result.status).toBe("error");
    expect(result.error).toContain("required");
  });
});
