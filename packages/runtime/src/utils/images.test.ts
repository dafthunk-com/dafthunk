import { describe, expect, it } from "vitest";
import {
  imageFilename,
  imageSizeError,
  imageToBase64,
  readOptionalImage,
} from "./images";

const bytes = (length: number) => new Uint8Array(length).fill(1);

describe("imageToBase64", () => {
  it("passes through data that is already encoded", () => {
    expect(imageToBase64({ data: "YWJj" })).toBe("YWJj");
  });

  it("encodes raw bytes", () => {
    expect(imageToBase64({ data: new TextEncoder().encode("abc") })).toBe(
      "YWJj"
    );
  });
});

describe("imageFilename", () => {
  it("keeps the filename the image already carries", () => {
    expect(
      imageFilename({
        data: bytes(1),
        mimeType: "image/png",
        filename: "a.png",
      })
    ).toBe("a.png");
  });

  it("derives an extension from the mime subtype", () => {
    expect(imageFilename({ data: bytes(1), mimeType: "image/jpeg" })).toBe(
      "image.jpeg"
    );
  });

  it("strips a structured-syntax suffix from the subtype", () => {
    expect(imageFilename({ data: bytes(1), mimeType: "image/svg+xml" })).toBe(
      "image.svg"
    );
  });

  it("falls back to png when the mime type has no subtype", () => {
    expect(imageFilename({ data: bytes(1), mimeType: "image" })).toBe(
      "image.png"
    );
  });

  it("uses the supplied base name", () => {
    expect(
      imageFilename({ data: bytes(1), mimeType: "image/png" }, "photo")
    ).toBe("photo.png");
  });
});

describe("imageSizeError", () => {
  it("returns nothing when the image fits", () => {
    expect(
      imageSizeError({ data: bytes(100), mimeType: "image/png" }, 200, "X")
    ).toBeUndefined();
  });

  it("treats an image exactly at the limit as fitting", () => {
    expect(
      imageSizeError({ data: bytes(200), mimeType: "image/png" }, 200, "X")
    ).toBeUndefined();
  });

  it("names the provider and both sizes when it does not fit", () => {
    const error = imageSizeError(
      { data: bytes(3 * 1024 * 1024), mimeType: "image/png" },
      1024 * 1024,
      "Telegram"
    );

    expect(error).toBe(
      "Image is 3.0 MB, which exceeds the Telegram limit of 1.0 MB"
    );
  });
});

describe("readOptionalImage", () => {
  it("reports nothing for an absent input", () => {
    expect(readOptionalImage(undefined)).toEqual({});
    expect(readOptionalImage(null)).toEqual({});
  });

  it("reads a resolved image blob", () => {
    const data = bytes(4);
    expect(
      readOptionalImage({ data, mimeType: "image/png", filename: "a.png" })
    ).toEqual({ image: { data, mimeType: "image/png", filename: "a.png" } });
  });

  it("leaves the filename undefined when the blob has none", () => {
    const data = bytes(4);
    expect(readOptionalImage({ data, mimeType: "image/png" })).toEqual({
      image: { data, mimeType: "image/png", filename: undefined },
    });
  });

  it("errors when something else is connected", () => {
    expect(readOptionalImage("https://example.com/a.png").error).toBe(
      "Image input is missing or invalid"
    );
    expect(readOptionalImage({ mimeType: "image/png" }).error).toBe(
      "Image input is missing or invalid"
    );
    expect(readOptionalImage({ data: bytes(1) }).error).toBe(
      "Image input is missing or invalid"
    );
  });

  it("ignores a filename that is not a string", () => {
    const data = bytes(4);
    const { image } = readOptionalImage({
      data,
      mimeType: "image/png",
      filename: 42,
    });

    expect(image?.filename).toBeUndefined();
  });
});
