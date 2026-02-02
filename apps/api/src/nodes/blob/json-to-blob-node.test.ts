import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { BlobParameter, NodeContext } from "../../runtime/node-types";
import { JsonToBlobNode } from "./json-to-blob-node";

describe("JsonToBlobNode", () => {
  it("should convert simple JSON object to blob", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John Doe",
      age: 30,
      email: "john@example.com",
    };
    const context = {
      nodeId,
      inputs: {
        json,
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
    expect(blob.mimeType).toBe("application/json");
    expect(blob.data).toBeInstanceOf(Uint8Array);

    // Verify the data can be decoded back to the original JSON
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(blob.data);
    const parsedJson = JSON.parse(jsonString);
    expect(parsedJson).toEqual(json);
  });

  it("should convert nested JSON object to blob", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const json = {
      user: {
        profile: {
          name: "Jane Smith",
          email: "jane@example.com",
        },
        settings: {
          theme: "dark",
          notifications: true,
        },
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();

    const blob = result.outputs?.blob as BlobParameter;
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(blob.data);
    const parsedJson = JSON.parse(jsonString);
    expect(parsedJson).toEqual(json);
  });

  it("should convert JSON array to blob", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const json = [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
    ];
    const context = {
      nodeId,
      inputs: {
        json,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(blob.data);
    const parsedJson = JSON.parse(jsonString);
    expect(parsedJson).toEqual(json);
  });

  it("should use custom MIME type when provided", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const json = { test: "data" };
    const customMimeType = "application/vnd.api+json";
    const context = {
      nodeId,
      inputs: {
        json,
        mimeType: customMimeType,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    expect(blob.mimeType).toBe(customMimeType);
  });

  it("should handle empty JSON object", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const json = {};
    const context = {
      nodeId,
      inputs: {
        json,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(blob.data);
    expect(jsonString).toBe("{}");
  });

  it("should handle empty array", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const json: any[] = [];
    const context = {
      nodeId,
      inputs: {
        json,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(blob.data);
    expect(jsonString).toBe("[]");
  });

  it("should handle primitive values", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const json = "hello world";
    const context = {
      nodeId,
      inputs: {
        json,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(blob.data);
    expect(JSON.parse(jsonString)).toBe("hello world");
  });

  it("should error when json is undefined", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should error when json is null", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle special characters in JSON", async () => {
    const nodeId = "json-to-blob";
    const node = new JsonToBlobNode({
      nodeId,
    } as unknown as Node);

    const json = {
      text: "Hello 世界 🌍",
      emoji: "😀",
      special: 'quotes"and\\backslashes',
    };
    const context = {
      nodeId,
      inputs: {
        json,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");

    const blob = result.outputs?.blob as BlobParameter;
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(blob.data);
    const parsedJson = JSON.parse(jsonString);
    expect(parsedJson).toEqual(json);
  });
});
