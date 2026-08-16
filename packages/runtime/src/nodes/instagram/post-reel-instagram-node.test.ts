import type { MultiStepNodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostReelInstagramNode } from "./post-reel-instagram-node";

global.fetch = vi.fn();

const nodeId = "post-reel-instagram";

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

const writeAndPresign = vi.fn();
const sleep = vi.fn().mockResolvedValue(undefined);

const createContext = (
  inputs: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) =>
  ({
    nodeId,
    inputs,
    organizationId: "org-1",
    objectStore: { writeAndPresign },
    sleep,
    doStep: (fn: () => Promise<unknown>) => fn(),
    getIntegration: vi.fn().mockResolvedValue({
      token: "test-token",
      metadata: { userId: "17841400000000000" },
    }),
    ...overrides,
  }) as unknown as MultiStepNodeContext;

const node = () => new PostReelInstagramNode({ nodeId } as unknown as Node);

const video = { data: new Uint8Array([1, 2, 3]), mimeType: "video/mp4" };

describe("PostReelInstagramNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeAndPresign.mockResolvedValue("https://r2.example/media.mp4");
  });

  it("stages the video, waits for processing, and publishes", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse({ id: "container-1" }) as never)
      .mockResolvedValueOnce(
        jsonResponse({ status_code: "IN_PROGRESS" }) as never
      )
      .mockResolvedValueOnce(jsonResponse({ status_code: "FINISHED" }) as never)
      .mockResolvedValueOnce(jsonResponse({ id: "media-9" }) as never)
      .mockResolvedValueOnce(
        jsonResponse({
          permalink: "https://www.instagram.com/reel/xyz/",
        }) as never
      );

    const result = await node().execute(
      createContext({ integrationId: "i-1", video, caption: "new reel" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.id).toBe("media-9");
    expect(result.outputs?.permalink).toBe(
      "https://www.instagram.com/reel/xyz/"
    );
    expect(sleep).toHaveBeenCalledWith(10_000);

    const [createUrl, createInit] = vi.mocked(global.fetch).mock.calls[0];
    expect(createUrl).toBe(
      "https://graph.instagram.com/v23.0/17841400000000000/media"
    );
    const createBody = createInit?.body as URLSearchParams;
    expect(createBody.get("media_type")).toBe("REELS");
    expect(createBody.get("video_url")).toBe("https://r2.example/media.mp4");
    expect(createBody.get("caption")).toBe("new reel");
    expect(createBody.get("share_to_feed")).toBeNull();
  });

  it("stages the cover image and keeps the reel out of the feed", async () => {
    writeAndPresign
      .mockResolvedValueOnce("https://r2.example/media.mp4")
      .mockResolvedValueOnce("https://r2.example/cover.jpg");
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse({ id: "container-1" }) as never)
      .mockResolvedValueOnce(jsonResponse({ status_code: "FINISHED" }) as never)
      .mockResolvedValueOnce(jsonResponse({ id: "media-9" }) as never)
      .mockResolvedValueOnce(jsonResponse({ permalink: "https://x" }) as never);

    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        video,
        coverImage: { data: new Uint8Array([7]), mimeType: "image/jpeg" },
        shareToFeed: false,
      })
    );

    expect(result.status).toBe("completed");
    expect(writeAndPresign).toHaveBeenCalledTimes(2);

    const createBody = vi.mocked(global.fetch).mock.calls[0][1]
      ?.body as URLSearchParams;
    expect(createBody.get("cover_url")).toBe("https://r2.example/cover.jpg");
    expect(createBody.get("share_to_feed")).toBe("false");
  });

  it("fails when Instagram cannot process the video", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse({ id: "container-1" }) as never)
      .mockResolvedValueOnce(
        jsonResponse({
          status_code: "ERROR",
          status: "Video format not supported",
        }) as never
      );

    const result = await node().execute(
      createContext({ integrationId: "i-1", video })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Video format not supported");
  });

  it("times out when processing never finishes", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse({ id: "container-1" }) as never)
      .mockResolvedValue(jsonResponse({ status_code: "IN_PROGRESS" }) as never);

    const result = await node().execute(
      createContext({ integrationId: "i-1", video })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("did not finish processing");
    expect(sleep).toHaveBeenCalledTimes(59);
  });

  it("rejects an unsupported video format before any API call", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        video: { data: new Uint8Array([1]), mimeType: "video/webm" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("MP4 or MOV");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(writeAndPresign).not.toHaveBeenCalled();
  });

  it("requires a video", async () => {
    const result = await node().execute(
      createContext({ integrationId: "i-1" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Video input is missing or invalid");
  });

  it("errors when the object store is unavailable", async () => {
    const result = await node().execute(
      createContext({ integrationId: "i-1", video }, { objectStore: undefined })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("ObjectStore not available");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
