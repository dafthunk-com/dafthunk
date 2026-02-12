import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { CloudflareBrowserSnapshotNode } from "./cloudflare-browser-snapshot-node";

describe("CloudflareBrowserSnapshotNode", () => {
  it("should get HTML content and screenshot from a URL", async () => {
    const nodeId = "cloudflare-browser-snapshot";
    const node = new CloudflareBrowserSnapshotNode({
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
    expect(result.outputs?.content).toBeDefined();
    expect(typeof result.outputs?.content).toBe("string");
    expect(result.outputs?.content.length).toBeGreaterThan(0);
    expect(result.outputs?.screenshot).toBeDefined();
    expect(result.outputs?.screenshot.data).toBeDefined();
    expect(result.outputs?.screenshot.mimeType).toBe("image/png");
    expect(result.outputs?.screenshot.data.length).toBeGreaterThan(0);
    expect(result.outputs?.status).toBeDefined();
    expect(typeof result.outputs?.status).toBe("number");
  });

  it("should handle custom screenshot options", async () => {
    const nodeId = "cloudflare-browser-snapshot";
    const node = new CloudflareBrowserSnapshotNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        screenshotOptions: {
          fullPage: false,
          omitBackground: true,
        },
        viewport: {
          width: 1024,
          height: 768,
        },
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.content).toBeDefined();
    expect(result.outputs?.screenshot).toBeDefined();
    expect(result.outputs?.screenshot.data.length).toBeGreaterThan(0);
  });

  it("should handle HTML content input", async () => {
    const nodeId = "cloudflare-browser-snapshot";
    const node = new CloudflareBrowserSnapshotNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        html: "<html><body><h1>Test Page</h1><p>This is a test.</p></body></html>",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.content).toBeDefined();
    expect(result.outputs?.screenshot).toBeDefined();
  });

  it("should handle missing required parameters", async () => {
    const nodeId = "cloudflare-browser-snapshot";
    const node = new CloudflareBrowserSnapshotNode({
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
    const nodeId = "cloudflare-browser-snapshot";
    const node = new CloudflareBrowserSnapshotNode({
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

  it("should reject both url and html", async () => {
    const nodeId = "cloudflare-browser-snapshot";
    const node = new CloudflareBrowserSnapshotNode({
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
