import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharePostXNode } from "./share-post-x-node";

global.fetch = vi.fn();

const nodeId = "share-post-x";

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

const createContext = (inputs: Record<string, unknown>) =>
  ({
    nodeId,
    inputs,
    organizationId: "org-1",
    getIntegration: vi.fn().mockResolvedValue({ token: "test-token" }),
  }) as unknown as NodeContext;

const node = () => new SharePostXNode({ nodeId } as unknown as Node);

const image = { data: new Uint8Array([1, 2, 3]), mimeType: "image/png" };

const postResponse = jsonResponse({ data: { id: "99", text: "hello" } });

describe("SharePostXNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts text without touching the media endpoint", async () => {
    vi.mocked(global.fetch).mockResolvedValue(postResponse as never);

    const result = await node().execute(
      createContext({ integrationId: "i-1", text: "hello" })
    );

    expect(result.status).toBe("completed");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
      "https://api.x.com/2/tweets"
    );
  });

  it("uploads the image and attaches its media id to the post", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse({ data: { id: "media-7" } }) as never)
      .mockResolvedValueOnce(postResponse as never);

    const result = await node().execute(
      createContext({ integrationId: "i-1", text: "hello", image })
    );

    expect(result.status).toBe("completed");

    const [uploadUrl, uploadInit] = vi.mocked(global.fetch).mock.calls[0];
    expect(uploadUrl).toBe("https://api.x.com/2/media/upload");
    expect(uploadInit?.body).toBeInstanceOf(FormData);
    const form = uploadInit?.body as FormData;
    expect(form.get("media_category")).toBe("tweet_image");
    expect(form.get("media_type")).toBe("image/png");
    expect((form.get("media") as File).name).toBe("image.png");

    const [, postInit] = vi.mocked(global.fetch).mock.calls[1];
    expect(JSON.parse(postInit?.body as string).media).toEqual({
      media_ids: ["media-7"],
    });
  });

  it("errors when the upload fails, without posting", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ title: "Unauthorized" }, false) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", text: "hello", image })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to upload image to X");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("errors when the upload returns no media id", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ data: {} }) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", text: "hello", image })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("no media id");
  });

  it("rejects an oversized image before uploading", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        text: "hello",
        image: { data: new Uint8Array(6 * 1024 * 1024), mimeType: "image/png" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("exceeds the X limit");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects an input that is not an image", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        text: "hello",
        image: "https://example.com/a.png",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Image input is missing or invalid");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
