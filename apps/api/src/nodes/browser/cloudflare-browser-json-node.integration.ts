import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CloudflareBrowserJsonNode } from "./cloudflare-browser-json-node";

describe("CloudflareBrowserJsonNode", () => {
  it("should extract JSON from a URL", async () => {
    const nodeId = "cloudflare-browser-json";
    const node = new CloudflareBrowserJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.json).toBeDefined();
    expect(typeof result.outputs?.json).toBe("object");
    expect(result.outputs?.status).toBeDefined();
    expect(typeof result.outputs?.status).toBe("number");
  });

  it("should extract JSON with prompt", async () => {
    const nodeId = "cloudflare-browser-json";
    const node = new CloudflareBrowserJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        prompt: "Extract the title and description as JSON",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.json).toBeDefined();
    expect(typeof result.outputs?.json).toBe("object");
  });

  it("should extract JSON with schema", async () => {
    const nodeId = "cloudflare-browser-json";
    const node = new CloudflareBrowserJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["title"],
        },
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.json).toBeDefined();
    expect(typeof result.outputs?.json).toBe("object");
  });

  it("should extract JSON from HTML content", async () => {
    const nodeId = "cloudflare-browser-json";
    const node = new CloudflareBrowserJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        html: "<html><body><h1>Test Title</h1><p>Test description</p></body></html>",
        prompt: "Extract title and description as JSON",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.json).toBeDefined();
    expect(typeof result.outputs?.json).toBe("object");
  });

  it("should handle missing required parameters", async () => {
    const nodeId = "cloudflare-browser-json";
    const node = new CloudflareBrowserJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "'url', 'CLOUDFLARE_ACCOUNT_ID', and 'CLOUDFLARE_API_TOKEN' are required"
    );
  });

  it("should handle missing environment variables", async () => {
    const nodeId = "cloudflare-browser-json";
    const node = new CloudflareBrowserJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "'url', 'CLOUDFLARE_ACCOUNT_ID', and 'CLOUDFLARE_API_TOKEN' are required"
    );
  });

  it("should handle custom goto options", async () => {
    const nodeId = "cloudflare-browser-json";
    const node = new CloudflareBrowserJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        gotoOptions: {
          waitUntil: "networkidle0",
          timeout: 30000,
        },
        waitForSelector: "h1",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.json).toBeDefined();
    expect(typeof result.outputs?.json).toBe("object");
  });
});
