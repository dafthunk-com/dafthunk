import type {
  CloudflareModelInfo,
  CloudflareModelSchema,
} from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { buildModelNodeType } from "./cloudflare-model-catalog";

// Cloudflare's catalog returns `id` as a UUID and `name` as the canonical
// `@cf/<provider>/<slug>` identifier — fixtures here mirror that shape.

const whisperInfo: CloudflareModelInfo = {
  id: "f5a59717-0d7b-4f78-9f1f-b6b1f3f4f4f4",
  name: "@cf/openai/whisper",
  description: "Speech recognition model.",
  task: { id: "asr", name: "Automatic Speech Recognition" },
};

const whisperSchema: CloudflareModelSchema = {
  model: "@cf/openai/whisper",
  inputs: [{ name: "audio", type: "audio", required: true }],
  outputs: [
    { name: "text", type: "string" },
    { name: "word_count", type: "number" },
  ],
};

const llamaInfo: CloudflareModelInfo = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  name: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  description: "Large language model with function calling.",
  task: { id: "text-gen", name: "Text Generation" },
};

const llamaSchema: CloudflareModelSchema = {
  model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  inputs: [
    { name: "prompt", type: "string", required: true },
    { name: "tools", type: "json", hidden: true },
  ],
  outputs: [{ name: "response", type: "any" }],
};

const sdxlInfo: CloudflareModelInfo = {
  id: "9876543a-bcde-f012-3456-789012345678",
  name: "@cf/bytedance/stable-diffusion-xl-lightning",
  task: { id: "txt2img", name: "Text-to-Image" },
};

const sdxlSchema: CloudflareModelSchema = {
  model: "@cf/bytedance/stable-diffusion-xl-lightning",
  inputs: [{ name: "prompt", type: "string", required: true }],
  outputs: [{ name: "output", type: "image" }],
};

describe("buildModelNodeType", () => {
  it("dispatches every synthesised entry to the cloudflare-model executable", () => {
    const node = buildModelNodeType(whisperInfo, whisperSchema);
    expect(node.type).toBe("cloudflare-model");
    expect(node.id).toBe("cf-model:@cf/openai/whisper");
  });

  it("pre-fills the hidden model input and editor metadata", () => {
    const node = buildModelNodeType(whisperInfo, whisperSchema);

    const modelInput = node.inputs.find((p) => p.name === "model");
    expect(modelInput).toBeDefined();
    expect(modelInput?.hidden).toBe(true);
    expect(modelInput?.value).toBe("@cf/openai/whisper");

    expect(node.metadata).toBeDefined();
    expect(node.metadata?._cf_locked).toBe("true");
    expect(typeof node.metadata?._cf_meta).toBe("string");
    const decoded = JSON.parse(node.metadata?._cf_meta ?? "{}");
    expect(decoded).toEqual({
      description: "Speech recognition model.",
      taskName: "Automatic Speech Recognition",
    });

    // Editor-only flags must NOT show up as inputs (they'd appear in the
    // wire format and pollute the parameter list).
    expect(node.inputs.some((p) => p.name === "_cf_meta")).toBe(false);
    expect(node.inputs.some((p) => p.name === "_cf_locked")).toBe(false);
  });

  it("preserves the schema's inputs alongside the hidden model input", () => {
    const node = buildModelNodeType(whisperInfo, whisperSchema);
    const audio = node.inputs.find((p) => p.name === "audio");
    expect(audio).toBeDefined();
    expect(audio?.type).toBe("audio");
    expect(audio?.required).toBe(true);
    // `model` comes first; the visible audio input follows immediately.
    expect(node.inputs[0]?.name).toBe("model");
    expect(node.inputs[1]?.name).toBe("audio");
  });

  it("forwards the schema's outputs verbatim", () => {
    const node = buildModelNodeType(whisperInfo, whisperSchema);
    expect(node.outputs.map((o) => o.name)).toEqual(["text", "word_count"]);
  });

  it("title-cases the display name from a kebab-cased model slug", () => {
    expect(buildModelNodeType(whisperInfo, whisperSchema).name).toBe("Whisper");
    expect(buildModelNodeType(llamaInfo, llamaSchema).name).toBe(
      "Llama 3.3 70b Instruct Fp8 Fast"
    );
  });

  it("derives icon and tags from the task taxonomy", () => {
    expect(buildModelNodeType(whisperInfo, whisperSchema).icon).toBe("mic");
    expect(buildModelNodeType(sdxlInfo, sdxlSchema).icon).toBe("image");
    expect(buildModelNodeType(llamaInfo, llamaSchema).icon).toBe("sparkles");

    const tags = buildModelNodeType(whisperInfo, whisperSchema).tags;
    expect(tags).toContain("AI");
    expect(tags).toContain("Cloudflare");
    expect(tags).toContain("Automatic Speech Recognition");
  });

  it("flags functionCalling for models exposing a `tools` schema input", () => {
    expect(buildModelNodeType(llamaInfo, llamaSchema).functionCalling).toBe(
      true
    );
    expect(
      buildModelNodeType(whisperInfo, whisperSchema).functionCalling
    ).toBeUndefined();
  });

  it("links to the public Cloudflare docs page for the model", () => {
    expect(buildModelNodeType(whisperInfo, whisperSchema).referenceUrl).toBe(
      "https://developers.cloudflare.com/workers-ai/models/whisper/"
    );
  });

  it("drops accidental `model` collisions from the schema mapper", () => {
    const polluted: CloudflareModelSchema = {
      model: "@cf/openai/whisper",
      inputs: [
        { name: "model", type: "string" }, // collides with our hidden one
        { name: "audio", type: "audio", required: true },
      ],
      outputs: [{ name: "text", type: "string" }],
    };
    const node = buildModelNodeType(whisperInfo, polluted);
    const modelInputs = node.inputs.filter((p) => p.name === "model");
    expect(modelInputs).toHaveLength(1);
    expect(modelInputs[0]?.value).toBe("@cf/openai/whisper");
  });

  it("adds a Dafthunk `schema` input to models that publish `response_format`", () => {
    const llamaWithResponseFormat: CloudflareModelSchema = {
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      inputs: [
        { name: "prompt", type: "string", required: true },
        { name: "tools", type: "json", hidden: true },
        { name: "response_format", type: "json", hidden: true },
      ],
      outputs: [{ name: "response", type: "any" }],
    };
    const node = buildModelNodeType(llamaInfo, llamaWithResponseFormat);

    const schemaInput = node.inputs.find((p) => p.name === "schema");
    expect(schemaInput).toBeDefined();
    expect(schemaInput?.type).toBe("schema");
    expect(schemaInput?.hidden).toBe(true);

    // The raw `response_format` field stays available as the escape hatch.
    expect(node.inputs.some((p) => p.name === "response_format")).toBe(true);

    // The synthetic `schema` is positioned after `model` for editor clarity.
    expect(node.inputs[0]?.name).toBe("model");
    expect(node.inputs[1]?.name).toBe("schema");
  });

  it("does not add `schema` input to models without `response_format`", () => {
    const node = buildModelNodeType(whisperInfo, whisperSchema);
    expect(node.inputs.some((p) => p.name === "schema")).toBe(false);
  });
});
