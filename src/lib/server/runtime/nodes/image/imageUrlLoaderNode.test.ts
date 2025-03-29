import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageUrlLoaderNode } from "./imageUrlLoaderNode";
import { Node } from "../../types";
import { StringRuntimeParameter, ImageRuntimeParameter } from "../../types";
import { ImageNodeParameter } from "../nodeTypes";
// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ImageUrlLoaderNode", () => {
  const mockNode: Node = {
    id: "test-id",
    name: "Test Image URL Loader",
    type: "image-url-loader",
    position: { x: 0, y: 0 },
    inputs: [
      {
        name: "url",
        type: StringRuntimeParameter,
        description: "The URL of the PNG image to load",
        required: true,
      },
    ],
    outputs: [
      {
        name: "imageData",
        type: ImageRuntimeParameter,
        description: "The image data as a binary array",
      },
    ],
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should return error if URL is not provided", async () => {
    const node = new ImageUrlLoaderNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("URL is required and must be a string");
  });

  it("should return error if URL is invalid", async () => {
    const node = new ImageUrlLoaderNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        url: "not-a-valid-url",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid URL format");
  });

  it("should return error if fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const node = new ImageUrlLoaderNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        url: "https://example.com/image.png",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Error fetching image: Network error");
  });

  it("should return error if response is not OK", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const node = new ImageUrlLoaderNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        url: "https://example.com/image.png",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to fetch image: 404 Not Found");
  });

  it("should return error if content type is not an image", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === "content-type" ? "text/html" : null),
      },
    });

    const node = new ImageUrlLoaderNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        url: "https://example.com/image.png",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "URL does not point to an image (content-type: text/html)"
    );
  });

  it("should successfully load image data", async () => {
    const mockArrayBuffer = new ArrayBuffer(4);
    const mockUint8Array = new Uint8Array(mockArrayBuffer);
    mockUint8Array.set([1, 2, 3, 4]);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === "content-type" ? "image/png" : null),
      },
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
    });

    const node = new ImageUrlLoaderNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        url: "https://example.com/image.png",
      },
    });

    expect(result.success).toBe(true);
    expect(result.outputs?.image).toBeInstanceOf(ImageNodeParameter);
    expect(result.outputs?.image.getValue()).toEqual({
      data: expect.any(Uint8Array),
      mimeType: "image/png",
    });
  });
});
