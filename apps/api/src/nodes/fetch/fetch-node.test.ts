import { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BlobParameter, NodeContext } from "../types";
import { FetchNode } from "./fetch-node";

// Mock fetch
global.fetch = vi.fn();

// Helper to convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
}

// Helper to decode BlobParameter to string
function blobToString(blob: BlobParameter): string {
  const decoder = new TextDecoder();
  return decoder.decode(blob.data);
}

describe("FetchNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should make a GET request successfully", async () => {
    const responseData = JSON.stringify({ url: "https://httpbin.org/get" });
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      arrayBuffer: vi.fn().mockResolvedValue(stringToArrayBuffer(responseData)),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://httpbin.org/get",
        method: "GET",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.status).toBe(200);
    expect(result.outputs?.statusText).toBe("OK");
    expect(result.outputs?.headers).toBeDefined();

    // Check BlobParameter structure
    const body = result.outputs?.body as BlobParameter;
    expect(body).toBeDefined();
    expect(body.data).toBeInstanceOf(Uint8Array);
    expect(body.mimeType).toBe("application/json");

    // Decode and parse JSON
    const bodyString = blobToString(body);
    expect(JSON.parse(bodyString)).toHaveProperty("url");
  });

  it("should make a POST request with body", async () => {
    const responseData = JSON.stringify({ json: { test: "data" } });
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      arrayBuffer: vi.fn().mockResolvedValue(stringToArrayBuffer(responseData)),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://httpbin.org/post",
        method: "POST",
        body: JSON.stringify({ test: "data" }),
        headers: { "Content-Type": "application/json" },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(200);
    expect(result.outputs?.statusText).toBe("OK");
    expect(result.outputs?.headers).toBeDefined();

    const body = result.outputs?.body as BlobParameter;
    expect(body).toBeDefined();
    expect(body.data).toBeInstanceOf(Uint8Array);

    const responseBody = JSON.parse(blobToString(body));
    expect(responseBody).toHaveProperty("json");
    expect(responseBody.json).toEqual({ test: "data" });
  });

  it("should handle query parameters", async () => {
    const responseData = JSON.stringify({
      args: { param1: "value1", param2: "value2" },
    });
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      arrayBuffer: vi.fn().mockResolvedValue(stringToArrayBuffer(responseData)),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://httpbin.org/get",
        method: "GET",
        query: { param1: "value1", param2: "value2" },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(200);

    const body = result.outputs?.body as BlobParameter;
    const responseBody = JSON.parse(blobToString(body));
    expect(responseBody).toHaveProperty("args");
    expect(responseBody.args).toHaveProperty("param1", "value1");
    expect(responseBody.args).toHaveProperty("param2", "value2");
  });

  it("should handle custom headers", async () => {
    const responseData = JSON.stringify({
      headers: {
        "X-Custom-Header": "test-value",
        "User-Agent": "test-agent",
      },
    });
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      arrayBuffer: vi.fn().mockResolvedValue(stringToArrayBuffer(responseData)),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://httpbin.org/headers",
        method: "GET",
        headers: {
          "X-Custom-Header": "test-value",
          "User-Agent": "test-agent",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(200);

    const body = result.outputs?.body as BlobParameter;
    const responseBody = JSON.parse(blobToString(body));
    expect(responseBody).toHaveProperty("headers");
    expect(responseBody.headers).toHaveProperty(
      "X-Custom-Header",
      "test-value"
    );
    expect(responseBody.headers).toHaveProperty("User-Agent", "test-agent");
  });

  it("should handle timeout", async () => {
    (global.fetch as any).mockRejectedValue(
      new Error("The user aborted a request.")
    );

    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://httpbin.org/delay/3",
        method: "GET",
        timeout: 1000, // 1 second timeout
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
    // The error message might vary depending on the environment
    expect(result.error).toMatch(/(aborted|timeout|network|fetch)/i);
  });

  it("should handle invalid URL", async () => {
    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "invalid-url",
        method: "GET",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle missing URL", async () => {
    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        method: "GET",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("'url' is a required input.");
  });

  it("should handle PUT request", async () => {
    const responseData = JSON.stringify({ json: { update: "data" } });
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      arrayBuffer: vi.fn().mockResolvedValue(stringToArrayBuffer(responseData)),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://httpbin.org/put",
        method: "PUT",
        body: JSON.stringify({ update: "data" }),
        headers: { "Content-Type": "application/json" },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(200);

    const body = result.outputs?.body as BlobParameter;
    const responseBody = JSON.parse(blobToString(body));
    expect(responseBody).toHaveProperty("json");
    expect(responseBody.json).toEqual({ update: "data" });
  });

  it("should handle DELETE request", async () => {
    const responseData = JSON.stringify({});
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      arrayBuffer: vi.fn().mockResolvedValue(stringToArrayBuffer(responseData)),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://httpbin.org/delete",
        method: "DELETE",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(200);
    expect(result.outputs?.statusText).toBe("OK");
  });

  it("should handle 404 error", async () => {
    const responseData = "Not Found";
    const mockResponse = {
      status: 404,
      statusText: "NOT FOUND",
      headers: new Map([
        ["content-type", "text/html"],
        ["server", "httpbin.org"],
      ]),
      arrayBuffer: vi.fn().mockResolvedValue(stringToArrayBuffer(responseData)),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://httpbin.org/status/404",
        method: "GET",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(404);
    expect(result.outputs?.statusText).toBe("NOT FOUND");
  });

  it("should handle 500 error", async () => {
    const responseData = "Internal Server Error";
    const mockResponse = {
      status: 500,
      statusText: "INTERNAL SERVER ERROR",
      headers: new Map([
        ["content-type", "text/html"],
        ["server", "httpbin.org"],
      ]),
      arrayBuffer: vi.fn().mockResolvedValue(stringToArrayBuffer(responseData)),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "fetch";
    const node = new FetchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://httpbin.org/status/500",
        method: "GET",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(500);
    expect(result.outputs?.statusText).toBe("INTERNAL SERVER ERROR");
  });
});
