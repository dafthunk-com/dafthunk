import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BotSendPhotoTelegramNode } from "./bot-send-photo-telegram-node";

global.fetch = vi.fn();

const nodeId = "send-photo-telegram";

const sendResponse = {
  ok: true,
  json: vi.fn().mockResolvedValue({
    result: { message_id: 12, chat: { id: 34 } },
  }),
  text: vi.fn().mockResolvedValue(""),
};

const createContext = (inputs: Record<string, unknown>) =>
  ({
    nodeId,
    inputs,
    telegramBotToken: "bot-token",
  }) as unknown as NodeContext;

const node = () => new BotSendPhotoTelegramNode({ nodeId } as unknown as Node);

const photo = { data: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" };

describe("BotSendPhotoTelegramNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue(sendResponse as never);
  });

  it("uploads the photo as multipart", async () => {
    const result = await node().execute(
      createContext({ chatId: "34", photo, caption: "look" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs).toEqual({ messageId: "12", chatId: "34" });

    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("https://api.telegram.org/botbot-token/sendPhoto");
    const form = init?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("chat_id")).toBe("34");
    expect(form.get("caption")).toBe("look");
    expect((form.get("photo") as File).name).toBe("image.jpeg");
    // The boundary has to come from FormData, so no explicit content type.
    expect(init?.headers).toBeUndefined();
  });

  it("omits the caption when none is given", async () => {
    await node().execute(createContext({ chatId: "34", photo }));

    const form = vi.mocked(global.fetch).mock.calls[0][1]?.body as FormData;
    expect(form.get("caption")).toBeNull();
  });

  it("requires a photo", async () => {
    const result = await node().execute(createContext({ chatId: "34" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Photo is required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects a URL where an image is expected", async () => {
    const result = await node().execute(
      createContext({ chatId: "34", photo: "https://example.com/a.jpg" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Image input is missing or invalid");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects an oversized photo", async () => {
    const result = await node().execute(
      createContext({
        chatId: "34",
        photo: {
          data: new Uint8Array(11 * 1024 * 1024),
          mimeType: "image/png",
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("exceeds the Telegram limit");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects an over-long caption", async () => {
    const result = await node().execute(
      createContext({ chatId: "34", photo, caption: "x".repeat(1025) })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("1024 characters or less");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
