import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { BlobParameter, NodeContext } from "../../runtime/node-types";
import { BlobToJsonNode } from "./blob-to-json-node";

describe("BlobToJsonNode", () => {
  it("should parse simple JSON object from blob", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John Doe",
      age: 30,
      email: "john@example.com",
    };
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(JSON.stringify(json)),
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
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.json).toEqual(json);
  });

  it("should parse nested JSON object from blob", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
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
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(JSON.stringify(json)),
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
    expect(result.outputs?.json).toEqual(json);
  });

  it("should parse JSON array from blob", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
      nodeId,
    } as unknown as Node);

    const json = [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
    ];
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(JSON.stringify(json)),
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
    expect(result.outputs?.json).toEqual(json);
  });

  it("should parse empty JSON object from blob", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
      nodeId,
    } as unknown as Node);

    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode("{}"),
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
    expect(result.outputs?.json).toEqual({});
  });

  it("should parse empty array from blob", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
      nodeId,
    } as unknown as Node);

    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode("[]"),
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
    expect(result.outputs?.json).toEqual([]);
  });

  it("should parse primitive JSON values from blob", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
      nodeId,
    } as unknown as Node);

    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode('"hello world"'),
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
    expect(result.outputs?.json).toBe("hello world");
  });

  it("should handle special characters in JSON", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
      nodeId,
    } as unknown as Node);

    const json = {
      text: "Hello 世界 🌍",
      emoji: "😀",
      special: 'quotes"and\\backslashes',
    };
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(JSON.stringify(json)),
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
    expect(result.outputs?.json).toEqual(json);
  });

  it("should work with non-standard JSON MIME types", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
      nodeId,
    } as unknown as Node);

    const json = { key: "value" };
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(JSON.stringify(json)),
      mimeType: "application/vnd.api+json",
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
    expect(result.outputs?.json).toEqual(json);
  });

  it("should error when blob is missing", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
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
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
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

  it("should error when blob contains invalid JSON", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
      nodeId,
    } as unknown as Node);

    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode("{ invalid json }"),
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
    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to parse JSON");
  });

  it("should error when blob contains malformed JSON", async () => {
    const nodeId = "blob-to-json";
    const node = new BlobToJsonNode({
      nodeId,
    } as unknown as Node);

    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode('{"key": "value"'),
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
    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to parse JSON");
  });
});
