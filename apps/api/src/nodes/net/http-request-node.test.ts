import { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NodeContext } from "../types";
import { HttpRequestNode } from "./http-request-node";

// Mock fetch
global.fetch = vi.fn();

describe("HttpRequestNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should make a GET request successfully", async () => {
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      text: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ url: "https://httpbin.org/get" })),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "http-request";
    const node = new HttpRequestNode({
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
    expect(typeof result.outputs?.body).toBe("string");
    expect(JSON.parse(result.outputs?.body || "{}")).toHaveProperty("url");
  });

  it("should make a POST request with body", async () => {
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      text: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ json: { test: "data" } })),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "http-request";
    const node = new HttpRequestNode({
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
    expect(typeof result.outputs?.body).toBe("string");

    const responseBody = JSON.parse(result.outputs?.body || "{}");
    expect(responseBody).toHaveProperty("json");
    expect(responseBody.json).toEqual({ test: "data" });
  });

  it("should handle query parameters", async () => {
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          args: { param1: "value1", param2: "value2" },
        })
      ),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "http-request";
    const node = new HttpRequestNode({
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

    const responseBody = JSON.parse(result.outputs?.body || "{}");
    expect(responseBody).toHaveProperty("args");
    expect(responseBody.args).toHaveProperty("param1", "value1");
    expect(responseBody.args).toHaveProperty("param2", "value2");
  });

  it("should handle custom headers", async () => {
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          headers: {
            "X-Custom-Header": "test-value",
            "User-Agent": "test-agent",
          },
        })
      ),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "http-request";
    const node = new HttpRequestNode({
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

    const responseBody = JSON.parse(result.outputs?.body || "{}");
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

    const nodeId = "http-request";
    const node = new HttpRequestNode({
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
    const nodeId = "http-request";
    const node = new HttpRequestNode({
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
    const nodeId = "http-request";
    const node = new HttpRequestNode({
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
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      text: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ json: { update: "data" } })),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "http-request";
    const node = new HttpRequestNode({
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

    const responseBody = JSON.parse(result.outputs?.body || "{}");
    expect(responseBody).toHaveProperty("json");
    expect(responseBody.json).toEqual({ update: "data" });
  });

  it("should handle DELETE request", async () => {
    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: new Map([
        ["content-type", "application/json"],
        ["server", "httpbin.org"],
      ]),
      text: vi.fn().mockResolvedValue(JSON.stringify({})),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "http-request";
    const node = new HttpRequestNode({
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
    const mockResponse = {
      status: 404,
      statusText: "NOT FOUND",
      headers: new Map([
        ["content-type", "text/html"],
        ["server", "httpbin.org"],
      ]),
      text: vi.fn().mockResolvedValue("Not Found"),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "http-request";
    const node = new HttpRequestNode({
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
    const mockResponse = {
      status: 500,
      statusText: "INTERNAL SERVER ERROR",
      headers: new Map([
        ["content-type", "text/html"],
        ["server", "httpbin.org"],
      ]),
      text: vi.fn().mockResolvedValue("Internal Server Error"),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "http-request";
    const node = new HttpRequestNode({
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
