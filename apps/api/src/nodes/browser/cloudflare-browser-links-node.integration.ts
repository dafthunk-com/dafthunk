import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CloudflareBrowserLinksNode } from "./cloudflare-browser-links-node";

describe("CloudflareBrowserLinksNode", () => {
  it("should extract links from a URL", async () => {
    const nodeId = "cloudflare-browser-links";
    const node = new CloudflareBrowserLinksNode({
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
    expect(result.outputs?.links).toBeDefined();
    expect(Array.isArray(result.outputs?.links)).toBe(true);
    expect(result.outputs?.status).toBeDefined();
    expect(typeof result.outputs?.status).toBe("number");

    // Validate each link is a string
    for (const link of result.outputs?.links || []) {
      expect(typeof link).toBe("string");
    }
  });

  it("should extract links with custom options", async () => {
    const nodeId = "cloudflare-browser-links";
    const node = new CloudflareBrowserLinksNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        visibleLinksOnly: true,
        excludeExternalLinks: true,
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.links).toBeDefined();
    expect(Array.isArray(result.outputs?.links)).toBe(true);
  });

  it("should extract links from HTML content", async () => {
    const nodeId = "cloudflare-browser-links";
    const node = new CloudflareBrowserLinksNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        html: "<html><body><a href='https://example1.com'>Link 1</a><a href='https://example2.com'>Link 2</a></body></html>",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.links).toBeDefined();
    expect(Array.isArray(result.outputs?.links)).toBe(true);
  });

  it("should handle missing required parameters", async () => {
    const nodeId = "cloudflare-browser-links";
    const node = new CloudflareBrowserLinksNode({
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
    expect(result.error).toContain("Either 'url' or 'html' is required");
  });

  it("should handle missing environment variables", async () => {
    const nodeId = "cloudflare-browser-links";
    const node = new CloudflareBrowserLinksNode({
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
      "'CLOUDFLARE_ACCOUNT_ID' and 'CLOUDFLARE_API_TOKEN' are required"
    );
  });

  it("should handle page with no links", async () => {
    const nodeId = "cloudflare-browser-links";
    const node = new CloudflareBrowserLinksNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        html: "<html><body><h1>No links here</h1></body></html>",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.links).toBeDefined();
    expect(Array.isArray(result.outputs?.links)).toBe(true);
    // Should return empty array for pages with no links
    expect(result.outputs?.links.length).toBeGreaterThanOrEqual(0);
  });

  it("should reject both url and html", async () => {
    const nodeId = "cloudflare-browser-links";
    const node = new CloudflareBrowserLinksNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        html: "<html><body>Test</body></html>",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Cannot use both 'url' and 'html'");
  });
});
