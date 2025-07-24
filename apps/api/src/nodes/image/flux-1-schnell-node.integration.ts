import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { Flux1SchnellNode } from "./flux-1-schnell-node";

describe("Flux1SchnellNode", () => {
  it("should generate an image from text prompt", async () => {
    const nodeId = "flux-1-schnell";
    const node = new Flux1SchnellNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        prompt: "A simple yellow star",
        steps: 8, // Changed from 10 to 8 (max allowed)
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.image).toBeDefined();
    expect(result.outputs?.image.data).toBeDefined();
    expect(result.outputs?.image.mimeType).toBe("image/jpeg");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });
});
