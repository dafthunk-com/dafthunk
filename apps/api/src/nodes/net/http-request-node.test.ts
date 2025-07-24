import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { HttpRequestNode } from "./http-request-node";

describe("HttpRequestNode", () => {
  it("should make a GET request successfully", async () => {
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("'url' is a required input.");
  });

  it("should handle PUT request", async () => {
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(200);
    expect(result.outputs?.statusText).toBe("OK");
  });

  it("should handle 404 error", async () => {
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(404);
    expect(result.outputs?.statusText).toBe("NOT FOUND");
  });

  it("should handle 500 error", async () => {
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.status).toBe(500);
    expect(result.outputs?.statusText).toBe("INTERNAL SERVER ERROR");
  });
});
