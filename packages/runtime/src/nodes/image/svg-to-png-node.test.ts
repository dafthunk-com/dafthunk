import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { PhotonImage } from "@cf-wasm/photon";
import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { SvgToPngNode } from "./svg-to-png-node";

// Fake RESSOURCES bucket backed by the on-disk TTFs, so the node can load
// fonts the same way it would from R2.
const fontsRoot = fileURLToPath(new URL("../../fonts", import.meta.url));
// Font binaries are fetched on demand (pnpm fonts:fetch), not committed.
// Tests that need real glyph rendering skip when they are absent.
const fontsPresent = existsSync(join(fontsRoot, "inter/Inter_400Regular.ttf"));
const staticBucket = {
  async get(key: string) {
    const path = join(fontsRoot, key.replace(/^fonts\//, ""));
    let bytes: Buffer;
    try {
      bytes = readFileSync(path);
    } catch {
      return null;
    }
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    );
    return { arrayBuffer: async () => buffer };
  },
} as unknown as R2Bucket;

function svgImage(svg: string) {
  return { data: new TextEncoder().encode(svg), mimeType: "image/svg+xml" };
}

function makeContext(
  inputs: Record<string, unknown>,
  env: Record<string, unknown> = {}
): NodeContext {
  return {
    nodeId: "svg-to-png",
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env,
  } as unknown as NodeContext;
}

// Decodes a raster image and reports per-pixel alpha statistics.
function alphaStats(data: Uint8Array) {
  const image = PhotonImage.new_from_byteslice(data);
  try {
    const pixels = image.get_raw_pixels();
    let opaque = 0;
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
      else opaque++;
    }
    return { opaque, transparent };
  } finally {
    image.free();
  }
}

describe("SvgToPngNode", () => {
  const node = new SvgToPngNode({ nodeId: "svg-to-png" } as unknown as Node);

  const rectSvg =
    '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="red"/></svg>';
  const textSvg =
    '<svg width="220" height="80" xmlns="http://www.w3.org/2000/svg"><text x="10" y="55" font-family="Inter" font-size="48" fill="black">Hello</text></svg>';

  it("renders a shape-only SVG to PNG without needing fonts", async () => {
    const result = await node.execute(makeContext({ svg: svgImage(rectSvg) }));
    expect(result.status).toBe("completed");
    expect(result.outputs?.image.mimeType).toBe("image/png");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });

  it.skipIf(!fontsPresent)(
    "renders SVG text with fonts loaded from the resources bucket",
    async () => {
      const result = await node.execute(
        makeContext({ svg: svgImage(textSvg) }, { RESSOURCES: staticBucket })
      );
      expect(result.status).toBe("completed");

      // Text must actually rasterize: some opaque glyph pixels, with the
      // transparent background preserved around them.
      const { opaque, transparent } = alphaStats(result.outputs!.image.data);
      expect(opaque).toBeGreaterThan(50);
      expect(transparent).toBeGreaterThan(0);
    }
  );

  it.skipIf(!fontsPresent)(
    "encodes WebP output while preserving transparency",
    async () => {
      const result = await node.execute(
        makeContext(
          { svg: svgImage(textSvg), format: "webp" },
          { RESSOURCES: staticBucket }
        )
      );
      expect(result.status).toBe("completed");
      expect(result.outputs?.image.mimeType).toBe("image/webp");

      const { opaque, transparent } = alphaStats(result.outputs!.image.data);
      expect(opaque).toBeGreaterThan(50);
      expect(transparent).toBeGreaterThan(0);
    }
  );

  it("errors when text needs fonts but the resources bucket is missing", async () => {
    const result = await node.execute(makeContext({ svg: svgImage(textSvg) }));
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/resources store/i);
  });

  it("rejects an unsupported output format", async () => {
    const result = await node.execute(
      makeContext({ svg: svgImage(rectSvg), format: "gif" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/format/i);
  });
});
