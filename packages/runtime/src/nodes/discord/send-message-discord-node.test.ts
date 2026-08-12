import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SendMessageDiscordNode } from "./send-message-discord-node";

global.fetch = vi.fn();

const nodeId = "send-message-discord";

const sendResponse = {
  ok: true,
  json: vi.fn().mockResolvedValue({
    id: "m-1",
    channel_id: "c-1",
    timestamp: "2026-08-12T00:00:00Z",
  }),
  text: vi.fn().mockResolvedValue(""),
};

const createContext = (inputs: Record<string, unknown>) =>
  ({
    nodeId,
    inputs,
    organizationId: "org-1",
    getIntegration: vi.fn().mockResolvedValue({ token: "test-token" }),
  }) as unknown as NodeContext;

const node = () => new SendMessageDiscordNode({ nodeId } as unknown as Node);

const image = { data: new Uint8Array([1, 2, 3]), mimeType: "image/png" };

describe("SendMessageDiscordNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue(sendResponse as never);
  });

  it("sends a JSON body when there is no image", async () => {
    const result = await node().execute(
      createContext({ integrationId: "i-1", channelId: "c-1", content: "hi" })
    );

    expect(result.status).toBe("completed");
    const init = vi.mocked(global.fetch).mock.calls[0][1];
    expect(init?.body).toBe('{"content":"hi"}');
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });
  });

  it("sends multipart with the auth header preserved when there is an image", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        channelId: "c-1",
        content: "hi",
        image,
      })
    );

    expect(result.status).toBe("completed");
    const init = vi.mocked(global.fetch).mock.calls[0][1];
    expect(init?.body).toBeInstanceOf(FormData);
    expect(init?.headers).toEqual({ Authorization: "Bearer test-token" });
  });

  it("rejects an oversized image before calling Discord", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        channelId: "c-1",
        content: "hi",
        image: {
          data: new Uint8Array(26 * 1024 * 1024),
          mimeType: "image/png",
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("exceeds the Discord limit");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects an input that is not an image", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        channelId: "c-1",
        content: "hi",
        image: 42,
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Image input is missing or invalid");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
