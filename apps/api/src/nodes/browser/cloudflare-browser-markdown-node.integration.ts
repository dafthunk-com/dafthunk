import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CloudflareBrowserMarkdownNode } from "./cloudflare-browser-markdown-node";

describe("CloudflareBrowserMarkdownNode", () => {
  it("should extract markdown from a URL", async () => {
    const nodeId = "cloudflare-browser-markdown";
    const node = new CloudflareBrowserMarkdownNode({
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
    expect(result.outputs?.markdown).toBeDefined();
    expect(typeof result.outputs?.markdown).toBe("string");
    expect(result.outputs?.status).toBeDefined();
    expect(typeof result.outputs?.status).toBe("number");
  });

  it("should extract markdown with custom options", async () => {
    const nodeId = "cloudflare-browser-markdown";
    const node = new CloudflareBrowserMarkdownNode({
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
    expect(result.outputs?.markdown).toBeDefined();
    expect(typeof result.outputs?.markdown).toBe("string");
  });

  it("should extract markdown from HTML content", async () => {
    const nodeId = "cloudflare-browser-markdown";
    const node = new CloudflareBrowserMarkdownNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        html: "<html><body><h1>Test Title</h1><p>This is a test paragraph.</p></body></html>",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.markdown).toBeDefined();
    expect(typeof result.outputs?.markdown).toBe("string");
  });

  it("should handle missing required parameters", async () => {
    const nodeId = "cloudflare-browser-markdown";
    const node = new CloudflareBrowserMarkdownNode({
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
    const nodeId = "cloudflare-browser-markdown";
    const node = new CloudflareBrowserMarkdownNode({
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

  it("should handle complex HTML content", async () => {
    const nodeId = "cloudflare-browser-markdown";
    const node = new CloudflareBrowserMarkdownNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        html: `
          <html>
            <body>
              <h1>Main Title</h1>
              <h2>Subtitle</h2>
              <p>This is a <strong>bold</strong> paragraph with <em>italic</em> text.</p>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
              </ul>
              <ol>
                <li>Numbered item 1</li>
                <li>Numbered item 2</li>
              </ol>
            </body>
          </html>
        `,
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.markdown).toBeDefined();
    expect(typeof result.outputs?.markdown).toBe("string");
    expect(result.outputs?.markdown.length).toBeGreaterThan(0);
  });
});
