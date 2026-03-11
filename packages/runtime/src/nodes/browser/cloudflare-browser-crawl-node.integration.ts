import { env } from "cloudflare:test";
import type { MultiStepNodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { CloudflareBrowserCrawlNode } from "./cloudflare-browser-crawl-node";

/** Stub sleep/doStep for integration tests (no durable execution) */
function createMultiStepContext(
  inputs: Record<string, unknown>
): MultiStepNodeContext {
  return {
    nodeId: "cloudflare-browser-crawl",
    inputs,
    env: {
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
    },
    sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
    doStep: <T>(fn: () => Promise<T>) => fn(),
  } as unknown as MultiStepNodeContext;
}

describe("CloudflareBrowserCrawlNode", () => {
  it("should crawl pages from a URL", async () => {
    const node = new CloudflareBrowserCrawlNode({
      nodeId: "cloudflare-browser-crawl",
    } as unknown as Node);

    const context = createMultiStepContext({
      url: "https://example.com",
      limit: 2,
      poll_interval: 5,
      timeout: 5,
    });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.pages).toBeDefined();
    expect(Array.isArray(result.outputs?.pages)).toBe(true);
    expect(result.outputs?.count).toBeGreaterThan(0);
  });

  it("should handle missing url", async () => {
    const node = new CloudflareBrowserCrawlNode({
      nodeId: "cloudflare-browser-crawl",
    } as unknown as Node);

    const context = createMultiStepContext({});

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("'url' is required");
  });

  it("should handle missing environment variables", async () => {
    const node = new CloudflareBrowserCrawlNode({
      nodeId: "cloudflare-browser-crawl",
    } as unknown as Node);

    const context = {
      nodeId: "cloudflare-browser-crawl",
      inputs: { url: "https://example.com" },
      env: {},
      sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
      doStep: <T>(fn: () => Promise<T>) => fn(),
    } as unknown as MultiStepNodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "'CLOUDFLARE_ACCOUNT_ID' and 'CLOUDFLARE_API_TOKEN' are required"
    );
  });
});
