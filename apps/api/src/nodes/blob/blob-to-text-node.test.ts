import { BlobParameter, NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { BlobToTextNode } from "./blob-to-text-node";

describe("BlobToTextNode", () => {
  it("should decode plain text from blob", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const text = "Hello, World!";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(text),
      mimeType: "text/plain",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.text).toBe(text);
    expect(result.outputs?.mimeType).toBe("text/plain");
  });

  it("should decode HTML from blob", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const text = "<html><body>Hello</body></html>";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(text),
      mimeType: "text/html",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.text).toBe(text);
    expect(result.outputs?.mimeType).toBe("text/html");
  });

  it("should decode CSV from blob", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const text =
      "name,age,email\nJohn,30,john@example.com\nJane,25,jane@example.com";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(text),
      mimeType: "text/csv",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.text).toBe(text);
    expect(result.outputs?.mimeType).toBe("text/csv");
  });

  it("should decode XML from blob", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const text = '<?xml version="1.0"?><root><item>value</item></root>';
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(text),
      mimeType: "text/xml",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.text).toBe(text);
    expect(result.outputs?.mimeType).toBe("text/xml");
  });

  it("should decode empty string from blob", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(""),
      mimeType: "text/plain",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.text).toBe("");
  });

  it("should decode multiline text from blob", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const text = "Line 1\nLine 2\nLine 3";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(text),
      mimeType: "text/plain",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.text).toBe(text);
  });

  it("should handle special characters and Unicode", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const text = "Hello 世界 🌍\n¡Hola! Ça va?";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(text),
      mimeType: "text/plain",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.text).toBe(text);
  });

  it("should use custom encoding when provided", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const text = "Hello, World!";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(text),
      mimeType: "text/plain",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
        encoding: "utf-8",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.text).toBe(text);
  });

  it("should decode JSON text from blob (not parsed)", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const text = '{"key": "value"}';
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(text),
      mimeType: "application/json",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.text).toBe(text);
    expect(typeof result.outputs?.text).toBe("string");
  });

  it("should error when blob is missing", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        blob: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Blob is required");
  });

  it("should error when blob has invalid format", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        blob: { invalid: "format" },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid blob format");
  });

  it("should error with invalid encoding", async () => {
    const nodeId = "blob-to-text";
    const node = new BlobToTextNode({
      nodeId,
    } as unknown as Node);

    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode("test"),
      mimeType: "text/plain",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
        encoding: "invalid-encoding",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to decode");
  });
});
