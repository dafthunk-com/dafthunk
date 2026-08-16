import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostImageInstagramNode } from "./post-image-instagram-node";

global.fetch = vi.fn();

const nodeId = "post-image-instagram";

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

const writeAndPresign = vi.fn();

const createContext = (
  inputs: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) =>
  ({
    nodeId,
    inputs,
    organizationId: "org-1",
    objectStore: { writeAndPresign },
    getIntegration: vi.fn().mockResolvedValue({
      token: "test-token",
      metadata: { userId: "17841400000000000" },
    }),
    ...overrides,
  }) as unknown as NodeContext;

const node = () => new PostImageInstagramNode({ nodeId } as unknown as Node);

const image = { data: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" };

describe("PostImageInstagramNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeAndPresign.mockResolvedValue("https://r2.example/media.jpg");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stages the image, waits for the container, and publishes", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse({ id: "container-1" }) as never)
      .mockResolvedValueOnce(jsonResponse({ status_code: "FINISHED" }) as never)
      .mockResolvedValueOnce(jsonResponse({ id: "media-1" }) as never)
      .mockResolvedValueOnce(
        jsonResponse({ permalink: "https://www.instagram.com/p/abc/" }) as never
      );

    const result = await node().execute(
      createContext({ integrationId: "i-1", image, caption: "hello" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.id).toBe("media-1");
    expect(result.outputs?.permalink).toBe("https://www.instagram.com/p/abc/");
    expect(writeAndPresign).toHaveBeenCalledWith(
      image.data,
      "image/jpeg",
      "org-1"
    );

    const [createUrl, createInit] = vi.mocked(global.fetch).mock.calls[0];
    expect(createUrl).toBe(
      "https://graph.instagram.com/v23.0/17841400000000000/media"
    );
    const createBody = createInit?.body as URLSearchParams;
    expect(createBody.get("image_url")).toBe("https://r2.example/media.jpg");
    expect(createBody.get("caption")).toBe("hello");

    const [publishUrl, publishInit] = vi.mocked(global.fetch).mock.calls[2];
    expect(publishUrl).toBe(
      "https://graph.instagram.com/v23.0/17841400000000000/media_publish"
    );
    expect((publishInit?.body as URLSearchParams).get("creation_id")).toBe(
      "container-1"
    );
  });

  it("keeps polling while the container is processing", async () => {
    vi.useFakeTimers();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse({ id: "container-1" }) as never)
      .mockResolvedValueOnce(
        jsonResponse({ status_code: "IN_PROGRESS" }) as never
      )
      .mockResolvedValueOnce(jsonResponse({ status_code: "FINISHED" }) as never)
      .mockResolvedValueOnce(jsonResponse({ id: "media-1" }) as never)
      .mockResolvedValueOnce(jsonResponse({ permalink: "https://x" }) as never);

    const pending = node().execute(
      createContext({ integrationId: "i-1", image })
    );
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.status).toBe("completed");
    expect(result.outputs?.id).toBe("media-1");
    expect(global.fetch).toHaveBeenCalledTimes(5);
  });

  it("fails when Instagram cannot process the image", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse({ id: "container-1" }) as never)
      .mockResolvedValueOnce(
        jsonResponse({
          status_code: "ERROR",
          status: "Media upload has failed",
        }) as never
      );

    const result = await node().execute(
      createContext({ integrationId: "i-1", image })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Media upload has failed");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("surfaces the Graph API error when container creation fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ error: { message: "Invalid image URL" } }, false) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", image })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid image URL");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects an unsupported image format before any API call", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        image: { data: new Uint8Array([1]), mimeType: "image/webp" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("JPEG or PNG");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(writeAndPresign).not.toHaveBeenCalled();
  });

  it("rejects an oversized image", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        image: {
          data: new Uint8Array(9 * 1024 * 1024),
          mimeType: "image/jpeg",
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("exceeds the Instagram limit");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects an over-limit caption", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        image,
        caption: "a".repeat(2201),
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("limit of 2200");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("requires an image", async () => {
    const result = await node().execute(
      createContext({ integrationId: "i-1" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Image is required");
  });

  it("errors when the object store is unavailable", async () => {
    const result = await node().execute(
      createContext({ integrationId: "i-1", image }, { objectStore: undefined })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("ObjectStore not available");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
