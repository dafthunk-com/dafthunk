import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { BlobParameter, NodeContext } from "../types";
import { TextToBlobNode } from "./text-to-blob-node";

describe("TextToBlobNode", () => {
  it("should convert plain text to blob with default MIME type", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const text = "Hello, World!";
    const context = {
      nodeId,
      inputs: {
        text,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.blob).toBeDefined();

    const blob = result.outputs?.blob as BlobParameter;
    expect(blob.mimeType).toBe("text/plain");
    expect(blob.data).toBeInstanceOf(Uint8Array);

    // Verify the data can be decoded back to the original text
    const textDecoder = new TextDecoder();
    const decodedText = textDecoder.decode(blob.data);
    expect(decodedText).toBe(text);
  });

  it("should convert text to blob with custom MIME type", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const text = "<html><body>Hello</body></html>";
    const mimeType = "text/html";
    const context = {
      nodeId,
      inputs: {
        text,
        mimeType,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    expect(blob.mimeType).toBe(mimeType);

    const textDecoder = new TextDecoder();
    const decodedText = textDecoder.decode(blob.data);
    expect(decodedText).toBe(text);
  });

  it("should handle CSV MIME type", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const text =
      "name,age,email\nJohn,30,john@example.com\nJane,25,jane@example.com";
    const mimeType = "text/csv";
    const context = {
      nodeId,
      inputs: {
        text,
        mimeType,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    expect(blob.mimeType).toBe(mimeType);

    const textDecoder = new TextDecoder();
    const decodedText = textDecoder.decode(blob.data);
    expect(decodedText).toBe(text);
  });

  it("should handle XML MIME type", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const text = '<?xml version="1.0"?><root><item>value</item></root>';
    const mimeType = "text/xml";
    const context = {
      nodeId,
      inputs: {
        text,
        mimeType,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    expect(blob.mimeType).toBe(mimeType);

    const textDecoder = new TextDecoder();
    const decodedText = textDecoder.decode(blob.data);
    expect(decodedText).toBe(text);
  });

  it("should handle empty string", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const text = "";
    const context = {
      nodeId,
      inputs: {
        text,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    const textDecoder = new TextDecoder();
    const decodedText = textDecoder.decode(blob.data);
    expect(decodedText).toBe("");
  });

  it("should handle multiline text", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const text = "Line 1\nLine 2\nLine 3";
    const context = {
      nodeId,
      inputs: {
        text,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    const textDecoder = new TextDecoder();
    const decodedText = textDecoder.decode(blob.data);
    expect(decodedText).toBe(text);
  });

  it("should handle special characters and Unicode", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const text = "Hello 世界 🌍\n¡Hola! Ça va?";
    const context = {
      nodeId,
      inputs: {
        text,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    const textDecoder = new TextDecoder();
    const decodedText = textDecoder.decode(blob.data);
    expect(decodedText).toBe(text);
  });

  it("should error when text is undefined", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        text: undefined,
        mimeType: "text/plain",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should error when text is null", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        text: null,
        mimeType: "text/plain",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should error when text is not a string", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        text: 12345,
        mimeType: "text/plain",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("must be a string");
  });

  it("should error when mimeType is empty", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        text: "Hello",
        mimeType: "",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("MIME type is required");
  });

  it("should handle application MIME types", async () => {
    const nodeId = "text-to-blob";
    const node = new TextToBlobNode({
      nodeId,
    } as unknown as Node);

    const text = '{"key": "value"}';
    const mimeType = "application/json";
    const context = {
      nodeId,
      inputs: {
        text,
        mimeType,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    expect(blob.mimeType).toBe(mimeType);

    const textDecoder = new TextDecoder();
    const decodedText = textDecoder.decode(blob.data);
    expect(decodedText).toBe(text);
  });
});
