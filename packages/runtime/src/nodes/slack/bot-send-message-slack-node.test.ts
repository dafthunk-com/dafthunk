import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BotSendMessageSlackNode } from "./bot-send-message-slack-node";

global.fetch = vi.fn();

const nodeId = "bot-send-message-slack";

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

const createContext = (inputs: Record<string, unknown>) =>
  ({
    nodeId,
    inputs,
    slackBotToken: "xoxb-token",
  }) as unknown as NodeContext;

const node = () => new BotSendMessageSlackNode({ nodeId } as unknown as Node);

const image = { data: new Uint8Array([1, 2, 3]), mimeType: "image/png" };

const lease = jsonResponse({
  ok: true,
  upload_url: "https://files.slack.com/upload/abc",
  file_id: "F123",
});

const completed = jsonResponse({
  ok: true,
  files: [{ shares: { public: { C1: [{ ts: "111.222" }] } } }],
});

describe("BotSendMessageSlackNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts a plain message when there is no image", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({ ok: true, channel: "C1", ts: "1.2" }) as never
    );

    const result = await node().execute(
      createContext({ channelId: "C1", text: "hi" })
    );

    expect(result.status).toBe("completed");
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
      "https://slack.com/api/chat.postMessage"
    );
  });

  it("leases, uploads, then completes the share", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(lease as never)
      .mockResolvedValueOnce({ ok: true } as never)
      .mockResolvedValueOnce(completed as never);

    const result = await node().execute(
      createContext({ channelId: "C1", text: "hi", image })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs).toEqual({
      channelId: "C1",
      messageTs: "111.222",
      timestamp: "111.222",
    });

    const calls = vi.mocked(global.fetch).mock.calls;
    expect(calls[0][0]).toBe(
      "https://slack.com/api/files.getUploadURLExternal"
    );
    expect(String(calls[0][1]?.body)).toBe("filename=image.png&length=3");

    expect(calls[1][0]).toBe("https://files.slack.com/upload/abc");
    expect(calls[1][1]?.body).toBeInstanceOf(FormData);

    expect(calls[2][0]).toBe(
      "https://slack.com/api/files.completeUploadExternal"
    );
    expect(JSON.parse(calls[2][1]?.body as string)).toEqual({
      files: [{ id: "F123", title: "image.png" }],
      channel_id: "C1",
      initial_comment: "hi",
    });
  });

  it("forwards the thread timestamp when replying in a thread", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(lease as never)
      .mockResolvedValueOnce({ ok: true } as never)
      .mockResolvedValueOnce(completed as never);

    await node().execute(
      createContext({ channelId: "C1", text: "hi", image, threadTs: "9.9" })
    );

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[2][1]?.body as string
    );
    expect(body.thread_ts).toBe("9.9");
  });

  it("reads the share timestamp from a private channel", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(lease as never)
      .mockResolvedValueOnce({ ok: true } as never)
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          files: [{ shares: { private: { C1: [{ ts: "333.444" }] } } }],
        }) as never
      );

    const result = await node().execute(
      createContext({ channelId: "C1", text: "hi", image })
    );

    expect(result.outputs?.messageTs).toBe("333.444");
  });

  it("still succeeds when the share carries no timestamp", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(lease as never)
      .mockResolvedValueOnce({ ok: true } as never)
      .mockResolvedValueOnce(jsonResponse({ ok: true, files: [{}] }) as never);

    const result = await node().execute(
      createContext({ channelId: "C1", text: "hi", image })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.messageTs).toBe("");
  });

  it("surfaces a refused lease", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ ok: false, error: "missing_scope" }) as never
    );

    const result = await node().execute(
      createContext({ channelId: "C1", text: "hi", image })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("missing_scope");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces a failed completion", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(lease as never)
      .mockResolvedValueOnce({ ok: true } as never)
      .mockResolvedValueOnce(
        jsonResponse({ ok: false, error: "channel_not_found" }) as never
      );

    const result = await node().execute(
      createContext({ channelId: "C1", text: "hi", image })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("channel_not_found");
  });
});
