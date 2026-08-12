import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BotSendImageWhatsAppNode } from "./bot-send-image-whatsapp-node";

global.fetch = vi.fn();

const nodeId = "send-image-whatsapp";

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

const createContext = (inputs: Record<string, unknown>) =>
  ({
    nodeId,
    inputs,
    whatsappAccessToken: "wa-token",
    whatsappPhoneNumberId: "phone-1",
  }) as unknown as NodeContext;

const node = () => new BotSendImageWhatsAppNode({ nodeId } as unknown as Node);

const image = { data: new Uint8Array([1, 2, 3]), mimeType: "image/png" };

describe("BotSendImageWhatsAppNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads the image, then sends it by media id", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse({ id: "media-5" }) as never)
      .mockResolvedValueOnce(
        jsonResponse({ messages: [{ id: "msg-1" }] }) as never
      );

    const result = await node().execute(
      createContext({ to: "+15551234567", image, caption: "look" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs).toEqual({ messageId: "msg-1" });

    const [uploadUrl, uploadInit] = vi.mocked(global.fetch).mock.calls[0];
    expect(uploadUrl).toBe("https://graph.facebook.com/v21.0/phone-1/media");
    const form = uploadInit?.body as FormData;
    expect(form.get("messaging_product")).toBe("whatsapp");
    expect(form.get("type")).toBe("image/png");
    expect((form.get("file") as File).name).toBe("image.png");

    const [sendUrl, sendInit] = vi.mocked(global.fetch).mock.calls[1];
    expect(sendUrl).toBe("https://graph.facebook.com/v21.0/phone-1/messages");
    expect(JSON.parse(sendInit?.body as string).image).toEqual({
      id: "media-5",
      caption: "look",
    });
  });

  it("errors when the upload fails, without sending", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ error: "bad token" }, false) as never
    );

    const result = await node().execute(
      createContext({ to: "+15551234567", image })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to upload image to WhatsApp");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("errors when the upload returns no media id", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({}) as never);

    const result = await node().execute(
      createContext({ to: "+15551234567", image })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("no media id");
  });

  it("requires an image", async () => {
    const result = await node().execute(createContext({ to: "+15551234567" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Image is required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects an oversized image", async () => {
    const result = await node().execute(
      createContext({
        to: "+15551234567",
        image: { data: new Uint8Array(6 * 1024 * 1024), mimeType: "image/png" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("exceeds the WhatsApp limit");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
