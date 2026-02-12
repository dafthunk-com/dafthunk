import { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { ImageUrlLoaderNode } from "./image-url-loader-node";

// Mock fetch
global.fetch = vi.fn();

describe("ImageUrlLoaderNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load image from URL", async () => {
    const mockImageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
    const mockResponse = {
      ok: true,
      headers: new Map([["content-type", "image/png"]]),
      arrayBuffer: vi.fn().mockResolvedValue(mockImageData.buffer),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "image-url-loader";
    const node = new ImageUrlLoaderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com/test.png",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.image).toBeDefined();
    expect(result.outputs?.image.data).toBeDefined();
    expect(result.outputs?.image.mimeType).toBe("image/png");
    expect(result.outputs?.image.data).toEqual(mockImageData);
  });

  it("should handle invalid URL", async () => {
    const nodeId = "image-url-loader";
    const node = new ImageUrlLoaderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "invalid-url",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid URL format");
  });

  it("should handle missing URL", async () => {
    const nodeId = "image-url-loader";
    const node = new ImageUrlLoaderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("URL is required and must be a string");
  });

  it("should handle non-image content type", async () => {
    const mockResponse = {
      ok: true,
      headers: new Map([["content-type", "text/html"]]),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const nodeId = "image-url-loader";
    const node = new ImageUrlLoaderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com/test.html",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("URL does not point to an image");
  });

  it("should handle fetch error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    const nodeId = "image-url-loader";
    const node = new ImageUrlLoaderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        url: "https://example.com/test.png",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Error fetching image");
  });
});
