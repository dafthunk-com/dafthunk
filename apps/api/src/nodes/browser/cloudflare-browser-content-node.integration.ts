import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CloudflareBrowserContentNode } from "./cloudflare-browser-content-node";

describe("CloudflareBrowserContentNode", () => {
  it("should fetch HTML content from a URL", async () => {
    const nodeId = "cloudflare-browser-content";
    const node = new CloudflareBrowserContentNode({
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
    expect(result.outputs?.html).toBeDefined();
    expect(typeof result.outputs?.html).toBe("string");
    expect(result.outputs?.html.length).toBeGreaterThan(0);
    expect(result.outputs?.status).toBeDefined();
    expect(typeof result.outputs?.status).toBe("number");
  });

  it("should handle optional parameters", async () => {
    const nodeId = "cloudflare-browser-content";
    const node = new CloudflareBrowserContentNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        rejectResourceTypes: ["image", "stylesheet"],
        setExtraHTTPHeaders: {
          "User-Agent": "Test Browser",
        },
        gotoOptions: {
          waitUntil: "networkidle0",
          timeout: 30000,
        },
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.html).toBeDefined();
    expect(typeof result.outputs?.html).toBe("string");
  });

  it("should handle missing required parameters", async () => {
    const nodeId = "cloudflare-browser-content";
    const node = new CloudflareBrowserContentNode({
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

  it("should handle invalid URL", async () => {
    const nodeId = "cloudflare-browser-content";
    const node = new CloudflareBrowserContentNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://invalid-url-that-does-not-exist.com",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    // Should either complete with error or fail gracefully
    expect(["completed", "error"]).toContain(result.status);
  });
});
