import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CloudflareBrowserScrapeNode } from "./cloudflare-browser-scrape-node";

describe("CloudflareBrowserScrapeNode", () => {
  it("should scrape elements from a URL", async () => {
    const nodeId = "cloudflare-browser-scrape";
    const node = new CloudflareBrowserScrapeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        elements: ["h1", "p", "title"],
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.results).toBeDefined();
    expect(Array.isArray(result.outputs?.results)).toBe(true);
    expect(result.outputs?.results.length).toBeGreaterThan(0);
    expect(result.outputs?.status).toBeDefined();
    expect(typeof result.outputs?.status).toBe("number");

    // Validate each result has the expected structure
    for (const item of result.outputs?.results || []) {
      expect(item).toHaveProperty("result");
      expect(item).toHaveProperty("selector");
      expect(typeof item.result).toBe("string");
      expect(typeof item.selector).toBe("string");
    }
  });

  it("should scrape elements with custom options", async () => {
    const nodeId = "cloudflare-browser-scrape";
    const node = new CloudflareBrowserScrapeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        elements: ["h1", "p"],
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
    expect(result.outputs?.results).toBeDefined();
    expect(Array.isArray(result.outputs?.results)).toBe(true);
  });

  it("should scrape elements from HTML content", async () => {
    const nodeId = "cloudflare-browser-scrape";
    const node = new CloudflareBrowserScrapeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        html: "<html><body><h1>Test Title</h1><p>Test paragraph</p></body></html>",
        elements: ["h1", "p"],
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.results).toBeDefined();
    expect(Array.isArray(result.outputs?.results)).toBe(true);
  });

  it("should handle missing required parameters", async () => {
    const nodeId = "cloudflare-browser-scrape";
    const node = new CloudflareBrowserScrapeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        // Missing elements parameter
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "'url', 'elements', 'CLOUDFLARE_ACCOUNT_ID', and 'CLOUDFLARE_API_TOKEN' are required"
    );
  });

  it("should handle missing environment variables", async () => {
    const nodeId = "cloudflare-browser-scrape";
    const node = new CloudflareBrowserScrapeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        elements: ["h1", "p"],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "'url', 'elements', 'CLOUDFLARE_ACCOUNT_ID', and 'CLOUDFLARE_API_TOKEN' are required"
    );
  });

  it("should handle empty elements array", async () => {
    const nodeId = "cloudflare-browser-scrape";
    const node = new CloudflareBrowserScrapeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        elements: [],
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.results).toBeDefined();
    expect(Array.isArray(result.outputs?.results)).toBe(true);
    expect(result.outputs?.results.length).toBe(0);
  });
});
