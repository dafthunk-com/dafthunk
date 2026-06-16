import { describe, expect, it } from "vitest";

import { mapCloudflareGatewaySchema } from "./cloudflare-gateway-schema";

// Trimmed from the real xai/grok-imagine-video schema-input.json document.
const GROK_INPUT = {
  type: "object",
  additionalProperties: false,
  properties: {
    _operation: { enum: ["generate", "edit", "extend"], type: "string" },
    aspect_ratio: { enum: ["1:1", "16:9", "9:16"], type: "string" },
    duration: { minimum: 1, maximum: 15, type: "integer" },
    prompt: { type: "string" },
    image: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
    reference_images: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
    output: {
      type: "object",
      properties: { upload_url: { type: "string" } },
      required: ["upload_url"],
    },
  },
};

const GROK_OUTPUT = {
  type: "object",
  properties: { video: { type: "string" } },
};

describe("mapCloudflareGatewaySchema", () => {
  it("flags upload-url models and omits the output field as an input", () => {
    const { inputs, requiresUploadUrl } = mapCloudflareGatewaySchema(
      GROK_INPUT,
      GROK_OUTPUT
    );
    expect(requiresUploadUrl).toBe(true);
    expect(inputs.find((p) => p.name === "output")).toBeUndefined();
  });

  it("maps scalars, enums and numbers as visible editable fields", () => {
    const { inputs } = mapCloudflareGatewaySchema(GROK_INPUT, GROK_OUTPUT);
    const prompt = inputs.find((p) => p.name === "prompt");
    expect(prompt).toMatchObject({ type: "string", hidden: false });

    const aspect = inputs.find((p) => p.name === "aspect_ratio");
    expect(aspect?.type).toBe("string");
    expect(aspect?.enum).toEqual(["1:1", "16:9", "9:16"]);
    expect(aspect?.value).toBe("1:1");

    const duration = inputs.find((p) => p.name === "duration");
    expect(duration).toMatchObject({
      type: "number",
      minimum: 1,
      maximum: 15,
    });
  });

  it("maps {url} objects and arrays to blob inputs", () => {
    const { inputs } = mapCloudflareGatewaySchema(GROK_INPUT, GROK_OUTPUT);
    const image = inputs.find((p) => p.name === "image");
    expect(image).toMatchObject({ type: "image", hidden: true });

    const refs = inputs.find((p) => p.name === "reference_images");
    expect(refs).toMatchObject({ type: "image", repeated: true });
  });

  it("maps file outputs to blob types by name", () => {
    const { outputs } = mapCloudflareGatewaySchema(GROK_INPUT, GROK_OUTPUT);
    expect(outputs).toEqual([{ name: "video", type: "video" }]);
  });

  it("falls back to a single any output when none declared", () => {
    const { outputs, requiresUploadUrl } = mapCloudflareGatewaySchema(
      { type: "object", properties: { prompt: { type: "string" } } },
      undefined
    );
    expect(requiresUploadUrl).toBe(false);
    expect(outputs).toEqual([{ name: "output", type: "any" }]);
  });
});
