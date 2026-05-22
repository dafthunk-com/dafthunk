import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { ExtractEmailAttachmentsNode } from "./extract-email-attachments-node";

const { mockParse } = vi.hoisted(() => ({ mockParse: vi.fn() }));

vi.mock("postal-mime", () => ({
  default: class PostalMimeStub {
    parse = mockParse;
  },
}));

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

  const toArrayBuffer = (s: string): ArrayBuffer =>
    new TextEncoder().encode(s).buffer as ArrayBuffer;

  it("should extract single attachment from email", async () => {
    const node = new ExtractEmailAttachmentsNode({
      nodeId: "extract-email-attachments",
    } as unknown as Node);

    const pdfContent = toArrayBuffer("Hello PDF content");
    mockParse.mockResolvedValueOnce({
      headers: [],
      attachments: [
        {
          filename: "document.pdf",
          mimeType: "application/pdf",
          content: pdfContent,
        },
      ],
    });

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

    mockParse.mockResolvedValueOnce({
      headers: [],
      attachments: [
        {
          filename: "report.pdf",
          mimeType: "application/pdf",
          content: toArrayBuffer("PDF content"),
        },
        {
          filename: "screenshot.png",
          mimeType: "image/png",
          content: toArrayBuffer("Image content"),
        },
      ],
    });

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

    mockParse.mockResolvedValueOnce({
      headers: [],
      attachments: [],
    });

    const result = await node.execute(createContext({ raw: "mock raw email" }));
    expect(result.status).toBe("completed");
    expect(result.outputs?.attachments).toEqual([]);
  });

  it("should handle attachment without filename", async () => {
    const node = new ExtractEmailAttachmentsNode({
      nodeId: "extract-email-attachments",
    } as unknown as Node);

    mockParse.mockResolvedValueOnce({
      headers: [],
      attachments: [
        {
          filename: null,
          mimeType: "application/octet-stream",
          content: toArrayBuffer("Binary content"),
        },
      ],
    });

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

    mockParse.mockResolvedValueOnce({
      headers: [],
      attachments: [
        {
          filename: "unknown.bin",
          mimeType: "",
          content: toArrayBuffer("Binary content"),
        },
      ],
    });

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
