import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { NodeContext } from "../../runtime/node-types";
import { RecraftCreativeUpscaleNode } from "./recraft-creative-upscale";

describe("RecraftCreativeUpscaleNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "recraft-creative-upscale",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should have correct nodeType metadata", () => {
    expect(RecraftCreativeUpscaleNode.nodeType.id).toBe(
      "recraft-creative-upscale"
    );
    expect(RecraftCreativeUpscaleNode.nodeType.name).toBe(
      "Creative Upscale (Recraft)"
    );
    expect(RecraftCreativeUpscaleNode.nodeType.inputs).toHaveLength(1);
    expect(RecraftCreativeUpscaleNode.nodeType.inputs[0].name).toBe("image");
    expect(RecraftCreativeUpscaleNode.nodeType.inputs[0].type).toBe("image");
    expect(RecraftCreativeUpscaleNode.nodeType.inputs[0].required).toBe(true);
    expect(RecraftCreativeUpscaleNode.nodeType.outputs).toHaveLength(1);
    expect(RecraftCreativeUpscaleNode.nodeType.outputs[0].name).toBe("image");
    expect(RecraftCreativeUpscaleNode.nodeType.outputs[0].type).toBe("image");
  });

  it("should return error for missing REPLICATE_API_TOKEN", async () => {
    const node = new RecraftCreativeUpscaleNode({
      nodeId: "recraft-creative-upscale",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        image: {
          data: new Uint8Array([137, 80, 78, 71]), // PNG magic bytes
          mimeType: "image/png",
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for missing image input", async () => {
    const node = new RecraftCreativeUpscaleNode({
      nodeId: "recraft-creative-upscale",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for invalid image input type", async () => {
    const node = new RecraftCreativeUpscaleNode({
      nodeId: "recraft-creative-upscale",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        image: "not-an-image-object",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for image with missing data", async () => {
    const node = new RecraftCreativeUpscaleNode({
      nodeId: "recraft-creative-upscale",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        image: {
          mimeType: "image/png",
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for image with missing mimeType", async () => {
    const node = new RecraftCreativeUpscaleNode({
      nodeId: "recraft-creative-upscale",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        image: {
          data: new Uint8Array([137, 80, 78, 71]),
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });
});
