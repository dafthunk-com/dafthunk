import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { HttpRequestNode } from "../nodes/http/http-request-node";
import { HttpResponseNode } from "../nodes/http/http-response-node";
import type { NodeContext } from "../runtime/node-types";
import { httpEchoTemplate } from "./http-echo";

describe("HTTP Echo Template", () => {
  it("should have valid structure", () => {
    expect(httpEchoTemplate.nodes).toHaveLength(2);
    expect(httpEchoTemplate.edges).toHaveLength(1);

    const nodeIds = new Set(httpEchoTemplate.nodes.map((n) => n.id));
    for (const edge of httpEchoTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(httpEchoTemplate.id).toBe("http-echo");
    expect(httpEchoTemplate.name).toBe("HTTP Echo");
    expect(httpEchoTemplate.trigger).toBe("http_request");
    expect(httpEchoTemplate.tags).toContain("http");
  });

  it("should have correct node types", () => {
    const types = httpEchoTemplate.nodes.map((n) => n.type);
    expect(types).toContain("http-request");
    expect(types).toContain("http-response");
  });

  it("should connect request body to response body", () => {
    const edge = httpEchoTemplate.edges[0];
    expect(edge.source).toBe("request");
    expect(edge.target).toBe("response");
    expect(edge.sourceOutput).toBe("body");
    expect(edge.targetInput).toBe("body");
  });

  it("should echo text body from HTTP request to response", async () => {
    const testBody = "Hello, World!";
    const encoder = new TextEncoder();
    const bodyData = encoder.encode(testBody);

    // Execute HTTP Request node
    const requestNode = httpEchoTemplate.nodes.find((n) => n.id === "request")!;
    const requestInstance = new HttpRequestNode(requestNode);
    const requestResult = await requestInstance.execute({
      nodeId: requestNode.id,
      workflowId: "test-workflow",
      organizationId: "test-org",
      mode: "dev",
      inputs: {},
      httpRequest: {
        method: "POST",
        url: "https://example.com/echo",
        path: "/echo",
        headers: { "content-type": "text/plain" },
        queryParams: {},
        body: { data: bodyData, mimeType: "text/plain" },
      },
      env: env as Bindings,
      getIntegration: async () => {
        throw new Error("No integration");
      },
    } as NodeContext);

    expect(requestResult.status).toBe("completed");
    expect(requestResult.outputs?.body).toEqual({
      data: bodyData,
      mimeType: "text/plain",
    });

    // Execute HTTP Response node with body from request
    const responseNode = httpEchoTemplate.nodes.find(
      (n) => n.id === "response"
    )!;
    const responseInstance = new HttpResponseNode(responseNode);
    const responseResult = await responseInstance.execute({
      nodeId: responseNode.id,
      workflowId: "test-workflow",
      organizationId: "test-org",
      mode: "dev",
      inputs: {
        statusCode: 200,
        headers: {},
        body: requestResult.outputs?.body,
      },
      env: env as Bindings,
      getIntegration: async () => {
        throw new Error("No integration");
      },
    } as NodeContext);

    expect(responseResult.status).toBe("completed");
    expect(responseResult.outputs?.statusCode).toBe(200);
    expect(responseResult.outputs?.headers).toEqual({
      "content-type": "text/plain",
    });
    expect(responseResult.outputs?.body).toEqual({
      data: bodyData,
      mimeType: "text/plain",
    });
  });

  it("should echo JSON body from HTTP request to response", async () => {
    const testJson = { message: "Hello", count: 42 };
    const encoder = new TextEncoder();
    const bodyData = encoder.encode(JSON.stringify(testJson));

    // Execute HTTP Request node
    const requestNode = httpEchoTemplate.nodes.find((n) => n.id === "request")!;
    const requestInstance = new HttpRequestNode(requestNode);
    const requestResult = await requestInstance.execute({
      nodeId: requestNode.id,
      workflowId: "test-workflow",
      organizationId: "test-org",
      mode: "dev",
      inputs: {},
      httpRequest: {
        method: "POST",
        url: "https://example.com/echo",
        path: "/echo",
        headers: { "content-type": "application/json" },
        queryParams: {},
        body: { data: bodyData, mimeType: "application/json" },
      },
      env: env as Bindings,
      getIntegration: async () => {
        throw new Error("No integration");
      },
    } as NodeContext);

    expect(requestResult.status).toBe("completed");

    // Execute HTTP Response node
    const responseNode = httpEchoTemplate.nodes.find(
      (n) => n.id === "response"
    )!;
    const responseInstance = new HttpResponseNode(responseNode);
    const responseResult = await responseInstance.execute({
      nodeId: responseNode.id,
      workflowId: "test-workflow",
      organizationId: "test-org",
      mode: "dev",
      inputs: {
        statusCode: 200,
        headers: {},
        body: requestResult.outputs?.body,
      },
      env: env as Bindings,
      getIntegration: async () => {
        throw new Error("No integration");
      },
    } as NodeContext);

    expect(responseResult.status).toBe("completed");
    expect(responseResult.outputs?.statusCode).toBe(200);
    expect(responseResult.outputs?.headers).toEqual({
      "content-type": "application/json",
    });

    // Verify the body data matches
    const responseBody = responseResult.outputs?.body as {
      data: Uint8Array;
      mimeType: string;
    };
    expect(responseBody.mimeType).toBe("application/json");
    expect(new TextDecoder().decode(responseBody.data)).toBe(
      JSON.stringify(testJson)
    );
  });
});
