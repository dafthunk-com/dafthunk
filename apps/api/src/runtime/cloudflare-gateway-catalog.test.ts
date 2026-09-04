import {
  CF_LOCKED_KEY,
  CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME,
  CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE,
  CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME,
  type NodeType,
} from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { buildGatewayModelNodeType } from "./cloudflare-gateway-catalog";
import type { GatewayModelEntry } from "./gateway-models";
import { GATEWAY_MODELS } from "./gateway-models";

/**
 * The list is source, so what is worth asserting is what a reader cannot
 * check by eye: that no identifier is malformed or duplicated, and that every
 * entry carries what the palette renders. Which models are listed is a
 * curation decision and is not asserted, beyond keeping out the two that were
 * measured failing.
 */
describe("GATEWAY_MODELS", () => {
  it("addresses every model the way the gateway does", () => {
    const malformed = GATEWAY_MODELS.filter(
      (entry) => !/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(entry.id)
    ).map((entry) => entry.id);
    expect(malformed).toEqual([]);
  });

  it("lists each model once", () => {
    const ids = GATEWAY_MODELS.map((entry) => entry.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("gives the palette something to render for every entry", () => {
    const bare = GATEWAY_MODELS.filter(
      (entry) => !entry.author.trim() || !entry.description.trim()
    ).map((entry) => entry.id);
    expect(bare).toEqual([]);
  });

  it("stays sorted, so an addition reads as one line in a diff", () => {
    const ids = GATEWAY_MODELS.map((entry) => entry.id);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it("lists only models that have been run", () => {
    // Alibaba's two were listed, failed upstream with a 500 on a minimal
    // valid payload, and were removed. Pinned so a regeneration from the
    // catalog cannot quietly bring back a model known not to work.
    const known = GATEWAY_MODELS.map((entry) => entry.id);
    expect(known).not.toContain("alibaba/wan-3.0");
    expect(known).not.toContain("alibaba/hh1.1-i2v");
  });

  it("omits the model whose schema maps to nothing", () => {
    // Dropped on purpose rather than missed: it would arrive as a card with
    // no input to drive it. Asserted so a future regeneration that sweeps it
    // back in fails here instead of shipping.
    expect(GATEWAY_MODELS.map((entry) => entry.id)).not.toContain(
      "black-forest-labs/flux-3-video"
    );
  });
});

const VIDEO_ENTRY: GatewayModelEntry = {
  id: "alibaba/hh1-t2v",
  author: "Alibaba",
  task: "Text-to-Video",
  description: "Generates videos from a text prompt.",
};

describe("buildGatewayModelNodeType", () => {
  const schema = {
    inputs: [
      { name: "prompt", type: "string" as const, required: true },
      { name: "resolution", type: "string" as const },
    ],
    outputs: [{ name: "video", type: "video" as const }],
    requiresUploadUrl: false,
  };

  const nodeType = buildGatewayModelNodeType(VIDEO_ENTRY, schema);

  it("is one palette entry sharing the generic implementation", () => {
    expect(nodeType.id).toBe("cfg-model:alibaba/hh1-t2v");
    expect(nodeType.type).toBe(CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE);
    expect(nodeType.name).toBe("Alibaba Hh1 T2v");
  });

  it("pre-fills the identifier the executable reads", () => {
    const model = nodeType.inputs.find(
      (input) => input.name === CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME
    );
    expect(model?.value).toBe("alibaba/hh1-t2v");
    expect(model?.hidden).toBe(true);
  });

  it("carries the model's own ports, and nothing invented", () => {
    // Pins the list, so it also pins the count: the model's inputs plus the
    // one hidden identifier, in that order.
    expect(nodeType.inputs.map((input) => input.name)).toEqual([
      CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME,
      "prompt",
      "resolution",
    ]);
    expect(nodeType.outputs).toEqual([{ name: "video", type: "video" }]);
  });

  it("pins the model, since it is the entry's identity", () => {
    expect(nodeType.metadata?.[CF_LOCKED_KEY]).toBe("true");
  });

  it("tags the entry with its task and picks the matching icon", () => {
    expect(nodeType.tags).toContain("Text-to-Video");
    expect(nodeType.icon).toBe("video");
  });

  it("adds the upload marker only for file-output models", () => {
    const names = (candidate: NodeType) =>
      candidate.inputs.map((input) => input.name);
    expect(names(nodeType)).not.toContain(CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME);

    const uploading = buildGatewayModelNodeType(VIDEO_ENTRY, {
      ...schema,
      requiresUploadUrl: true,
    });
    // Its presence is the whole trigger for the runtime's presign-and-read-back
    // path, so a missing marker is a model that writes its file nowhere.
    expect(names(uploading)).toContain(CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME);
  });

  it("names a model by its author and slug, not its task", () => {
    const animator = buildGatewayModelNodeType(
      {
        id: "pruna/p-video-animate",
        author: "Pruna AI",
        task: "Image-to-Video",
        description: "Animates a subject from a reference image.",
      },
      schema
    );
    expect(animator.name).toBe("Pruna AI P Video Animate");
  });
});
