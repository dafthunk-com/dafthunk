import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CloudflareBrowserPdfNode } from "./cloudflare-browser-pdf-node";

describe("CloudflareBrowserPdfNode", () => {
  it("should generate PDF from a URL", async () => {
    const nodeId = "cloudflare-browser-pdf";
    const node = new CloudflareBrowserPdfNode({
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
    expect(result.outputs?.pdf).toBeDefined();
    expect(result.outputs?.pdf.data).toBeDefined();
    expect(result.outputs?.pdf.mimeType).toBe("application/pdf");
    expect(result.outputs?.pdf.data.length).toBeGreaterThan(0);
    expect(result.outputs?.status).toBeDefined();
    expect(typeof result.outputs?.status).toBe("number");
  });

  it("should generate PDF with custom options", async () => {
    const nodeId = "cloudflare-browser-pdf";
    const node = new CloudflareBrowserPdfNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        pdfOptions: {
          format: "A4",
          printBackground: true,
          margin: {
            top: "1in",
            bottom: "1in",
            left: "1in",
            right: "1in",
          },
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
    expect(result.outputs?.pdf).toBeDefined();
    expect(result.outputs?.pdf.data.length).toBeGreaterThan(0);
  });

  it("should generate PDF from HTML content", async () => {
    const nodeId = "cloudflare-browser-pdf";
    const node = new CloudflareBrowserPdfNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com",
        html: "<html><body><h1>Test Page</h1><p>This is a test.</p></body></html>",
      },
      env: {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.pdf).toBeDefined();
    expect(result.outputs?.pdf.data.length).toBeGreaterThan(0);
  });

  it("should handle missing required parameters", async () => {
    const nodeId = "cloudflare-browser-pdf";
    const node = new CloudflareBrowserPdfNode({
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
    const nodeId = "cloudflare-browser-pdf";
    const node = new CloudflareBrowserPdfNode({
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
});
