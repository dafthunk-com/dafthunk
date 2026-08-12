import { describe, expect, it } from "vitest";
import { discordMessageRequest } from "./discord-message";

const image = {
  data: new Uint8Array([1, 2, 3]),
  mimeType: "image/png",
};

describe("discordMessageRequest", () => {
  it("sends JSON when there is no image", () => {
    const request = discordMessageRequest({ content: "hi" });

    expect(request.headers).toEqual({ "Content-Type": "application/json" });
    expect(request.body).toBe('{"content":"hi"}');
  });

  it("sends multipart when there is an image", () => {
    const request = discordMessageRequest({ content: "hi" }, image);

    expect(request.body).toBeInstanceOf(FormData);
    // Left unset so fetch can add the multipart boundary.
    expect(request.headers).toEqual({});
  });

  it("pairs the file with an attachment entry of the same index", () => {
    const request = discordMessageRequest({ content: "hi" }, image);
    const form = request.body as FormData;

    expect(JSON.parse(form.get("payload_json") as string)).toEqual({
      content: "hi",
      attachments: [{ id: 0, filename: "image.png" }],
    });
    expect(form.get("files[0]")).toBeInstanceOf(Blob);
  });

  it("carries the rest of the payload into payload_json", () => {
    const request = discordMessageRequest(
      { content: "hi", embeds: [{ title: "t" }] },
      image
    );
    const form = request.body as FormData;

    expect(JSON.parse(form.get("payload_json") as string).embeds).toEqual([
      { title: "t" },
    ]);
  });

  it("names the file after the image", () => {
    const request = discordMessageRequest(
      { content: "hi" },
      {
        ...image,
        filename: "chart.jpg",
      }
    );
    const form = request.body as FormData;

    expect((form.get("files[0]") as File).name).toBe("chart.jpg");
    expect(
      JSON.parse(form.get("payload_json") as string).attachments[0].filename
    ).toBe("chart.jpg");
  });
});
