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

describe("union and single-value constraints", () => {
  it("bounds a field written as a range beside a sentinel", () => {
    // Verbatim from bytedance/seedance-2.5. Read without the union, this
    // property has no type, so it arrived as a free-form field and a request
    // for a 3 second video reached the provider and was rejected.
    const { inputs } = mapCloudflareGatewaySchema(
      {
        type: "object",
        properties: {
          duration: {
            description:
              "Generated video duration in seconds. Supported range: 4-30, or -1 for automatic selection.",
            default: 5,
            anyOf: [
              { type: "number", const: -1 },
              { type: "integer", minimum: 4, maximum: 30 },
            ],
          },
        },
      },
      undefined
    );

    const duration = inputs.find((input) => input.name === "duration");
    expect(duration?.type).toBe("number");
    expect(duration?.minimum).toBe(4);
    expect(duration?.maximum).toBe(30);
    // The description survives from the property, not the branch.
    expect(duration?.description).toContain("automatic selection");
    expect(duration?.value).toBe(5);
  });

  it("pins a numeric field that allows exactly one value", () => {
    const { inputs } = mapCloudflareGatewaySchema(
      {
        type: "object",
        properties: {
          fps: {
            description: "Frame rate",
            default: 24,
            type: "number",
            const: 24,
          },
        },
      },
      undefined
    );

    const fps = inputs.find((input) => input.name === "fps");
    expect(fps?.minimum).toBe(24);
    expect(fps?.maximum).toBe(24);
  });

  it("offers a string pinned to one value as that one option", () => {
    const { inputs } = mapCloudflareGatewaySchema(
      {
        type: "object",
        properties: { format: { type: "string", const: "mp4" } },
      },
      undefined
    );

    expect(inputs.find((input) => input.name === "format")?.enum).toEqual([
      "mp4",
    ]);
  });

  it("leaves a union it cannot resolve as a free-form field", () => {
    // Neither branch names a type, so there is nothing to bound it by and a
    // JSON field is the honest answer.
    const { inputs } = mapCloudflareGatewaySchema(
      { type: "object", properties: { odd: { anyOf: [{}, {}] } } },
      undefined
    );

    expect(inputs.find((input) => input.name === "odd")?.type).toBe("json");
  });
});
