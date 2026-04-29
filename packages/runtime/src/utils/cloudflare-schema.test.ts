import { describe, expect, it } from "vitest";
import { mapCloudflareSchema } from "./cloudflare-schema";

describe("mapCloudflareSchema", () => {
  it("maps a text classification model (distilbert-sst-2-int8)", () => {
    const result = mapCloudflareSchema({
      input: {
        type: "object",
        properties: {
          text: {
            type: "string",
            minLength: 1,
            description: "The text that you want to classify",
          },
        },
        required: ["text"],
      },
      output: {
        type: "array",
        contentType: "application/json",
        description: "An array of classification results for the input text",
        items: {
          type: "object",
          properties: {
            score: { type: "number" },
            label: { type: "string" },
          },
        },
      },
    });

    expect(result.inputs).toHaveLength(1);
    expect(result.inputs[0]).toMatchObject({
      name: "text",
      type: "string",
      required: true,
      hidden: false,
    });
    expect(result.outputs).toEqual([
      {
        name: "output",
        type: "json",
        description: "An array of classification results for the input text",
      },
    ]);
  });

  it("maps a translation model (m2m100-1.2b) with multiple required fields", () => {
    const result = mapCloudflareSchema({
      input: {
        type: "object",
        properties: {
          text: {
            type: "string",
            minLength: 1,
            description: "The text to be translated",
          },
          source_lang: {
            type: "string",
            default: "en",
            description: "Source language code",
          },
          target_lang: {
            type: "string",
            description: "Target language code",
          },
        },
        required: ["text", "target_lang"],
      },
      output: {
        type: "object",
        contentType: "application/json",
        properties: {
          translated_text: {
            type: "string",
            description: "The translated text",
          },
        },
      },
    });

    expect(result.inputs[0]).toMatchObject({
      name: "text",
      type: "string",
      required: true,
      hidden: false,
    });
    // source_lang has default + is not in required[] → hidden with preset value
    expect(result.inputs[1]).toMatchObject({
      name: "source_lang",
      type: "string",
      value: "en",
      hidden: true,
      required: false,
    });
    expect(result.inputs[2]).toMatchObject({
      name: "target_lang",
      type: "string",
      required: true,
      hidden: false,
    });

    expect(result.outputs).toEqual([
      {
        name: "translated_text",
        type: "string",
        description: "The translated text",
      },
    ]);
  });

  it("maps an image generation model (flux-1-schnell) with base64 output", () => {
    const result = mapCloudflareSchema({
      input: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            minLength: 1,
            maxLength: 2048,
            description:
              "A text description of the image you want to generate.",
          },
          steps: {
            type: "integer",
            default: 4,
            maximum: 8,
            description: "The number of diffusion steps",
          },
        },
        required: ["prompt"],
      },
      output: {
        type: "object",
        contentType: "application/json",
        properties: {
          image: {
            type: "string",
            description: "The generated image in Base64 format.",
          },
        },
      },
    });

    expect(result.inputs[0]).toMatchObject({
      name: "prompt",
      type: "string",
      required: true,
      hidden: false,
    });
    expect(result.inputs[1]).toMatchObject({
      name: "steps",
      type: "number",
      value: 4,
      hidden: true,
    });

    // Output field `image` should become a blob-typed parameter with base64 format hint
    expect(result.outputs).toEqual([
      {
        name: "image",
        type: "image",
        description: "The generated image in Base64 format.",
        format: "base64",
      },
    ]);
  });

  it("maps an image generation model with binary stream output (SDXL)", () => {
    const result = mapCloudflareSchema({
      input: {
        type: "object",
        properties: {
          prompt: { type: "string" },
        },
        required: ["prompt"],
      },
      output: {
        type: "string",
        contentType: "image/png",
        format: "binary",
        description: "The generated image in PNG format",
      },
    });

    expect(result.outputs).toEqual([
      {
        name: "output",
        type: "image",
        description: "The generated image in PNG format",
      },
    ]);
  });

  it("maps whisper — input oneOf(binary, object) with byte-array audio, multi-output", () => {
    const result = mapCloudflareSchema({
      input: {
        oneOf: [
          {
            type: "string",
            format: "binary",
            description: "Raw audio file data",
          },
          {
            type: "object",
            properties: {
              audio: {
                type: "array",
                items: { type: "number" },
                description: "Audio bytes as 8-bit unsigned integers",
              },
            },
            required: ["audio"],
          },
        ],
      },
      output: {
        type: "object",
        properties: {
          text: { type: "string", description: "The transcription" },
          word_count: { type: "number" },
          words: {
            type: "array",
            items: { type: "object" },
          },
          vtt: { type: "string" },
        },
      },
    });

    expect(result.inputs).toHaveLength(1);
    expect(result.inputs[0]).toMatchObject({
      name: "audio",
      type: "audio",
      required: true,
    });

    expect(result.outputs).toEqual([
      { name: "text", type: "string", description: "The transcription" },
      { name: "word_count", type: "number", description: undefined },
      { name: "words", type: "json", description: undefined },
      { name: "vtt", type: "string", description: undefined },
    ]);
  });

  it("maps resnet-50 — input oneOf with image byte array, array-of-objects output", () => {
    const result = mapCloudflareSchema({
      input: {
        oneOf: [
          { type: "string", format: "binary" },
          {
            type: "object",
            properties: {
              image: {
                type: "array",
                items: { type: "number" },
              },
            },
            required: ["image"],
          },
        ],
      },
      output: {
        type: "array",
        items: {
          type: "object",
          properties: {
            score: { type: "number" },
            label: { type: "string" },
          },
        },
      },
    });

    expect(result.inputs[0]).toMatchObject({
      name: "image",
      type: "image",
      required: true,
    });
    expect(result.outputs).toEqual([
      { name: "output", type: "json", description: undefined },
    ]);
  });

  it("maps an embeddings model (bge-base-en-v1.5) pooling enum", () => {
    const result = mapCloudflareSchema({
      input: {
        type: "object",
        properties: {
          text: {
            type: "string",
            minLength: 1,
            description: "The text to embed",
          },
          pooling: {
            type: "string",
            enum: ["mean", "cls"],
            default: "mean",
            description: "Embedding pooling method",
          },
        },
        required: ["text"],
      },
      output: {
        type: "object",
        properties: {
          shape: { type: "array", items: { type: "number" } },
          data: {
            type: "array",
            items: { type: "array", items: { type: "number" } },
          },
          pooling: { type: "string" },
        },
      },
    });

    expect(result.inputs[0]).toMatchObject({
      name: "text",
      type: "string",
      required: true,
    });
    expect(result.inputs[1]).toMatchObject({
      name: "pooling",
      type: "string",
      enum: ["mean", "cls"],
      value: "mean",
      hidden: true,
    });

    // All output properties are json or number/string — none detected as blobs
    expect(result.outputs).toEqual([
      { name: "shape", type: "json", description: undefined },
      { name: "data", type: "json", description: undefined },
      { name: "pooling", type: "string", description: undefined },
    ]);
  });

  it("maps melotts — input with prompt + lang, output oneOf (json vs binary)", () => {
    const result = mapCloudflareSchema({
      input: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            minLength: 1,
            description: "A text description of the audio you want to generate",
          },
          lang: {
            type: "string",
            default: "en",
            description: "The speech language",
          },
        },
        required: ["prompt"],
      },
      output: {
        oneOf: [
          {
            type: "object",
            contentType: "application/json",
            properties: {
              audio: {
                type: "string",
                description: "Generated audio in MP3 format, base64-encoded",
              },
            },
          },
          {
            type: "string",
            contentType: "audio/mpeg",
            format: "binary",
          },
        ],
      },
    });

    expect(result.inputs[0]).toMatchObject({
      name: "prompt",
      type: "string",
      required: true,
      hidden: false,
    });

    // oneOf prefers the object branch → base64 audio
    expect(result.outputs).toEqual([
      {
        name: "audio",
        type: "audio",
        description: "Generated audio in MP3 format, base64-encoded",
        format: "base64",
      },
    ]);
  });

  it("handles completely empty schema", () => {
    const result = mapCloudflareSchema({});
    expect(result.inputs).toEqual([]);
    expect(result.outputs).toEqual([{ name: "output", type: "any" }]);
  });

  it("preserves enum metadata on inputs", () => {
    const result = mapCloudflareSchema({
      input: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["fast", "quality"],
            description: "Rendering mode",
          },
        },
        required: ["mode"],
      },
      output: { type: "string" },
    });

    expect(result.inputs[0]).toMatchObject({
      name: "mode",
      type: "string",
      enum: ["fast", "quality"],
      required: true,
      hidden: false,
      value: "fast",
    });
  });

  it("unions properties when input is oneOf of multiple object branches (llama-style)", () => {
    const result = mapCloudflareSchema({
      input: {
        oneOf: [
          {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The input text prompt",
              },
              max_tokens: {
                type: "integer",
                default: 256,
              },
            },
            required: ["prompt"],
          },
          {
            type: "object",
            properties: {
              messages: {
                type: "array",
                items: { type: "object" },
                description: "Chat messages",
              },
              tools: {
                type: "array",
                items: { type: "object" },
                description: "Function-calling tool definitions",
              },
              max_tokens: {
                type: "integer",
                default: 256,
              },
            },
            required: ["messages"],
          },
        ],
      },
      output: {
        type: "object",
        properties: {
          response: { type: "string" },
          tool_calls: { type: "array", items: { type: "object" } },
        },
      },
    });

    const inputNames = result.inputs.map((i) => i.name);
    expect(inputNames).toEqual(
      expect.arrayContaining(["prompt", "messages", "tools", "max_tokens"])
    );

    // Branch-conditional inputs are not globally required, so the editor
    // doesn't force the user to fill both `prompt` AND `messages`.
    const prompt = result.inputs.find((i) => i.name === "prompt");
    const messages = result.inputs.find((i) => i.name === "messages");
    expect(prompt?.required).toBe(false);
    expect(messages?.required).toBe(false);

    const tools = result.inputs.find((i) => i.name === "tools");
    expect(tools).toBeDefined();
    expect(tools?.hidden).toBe(true);
  });
});
