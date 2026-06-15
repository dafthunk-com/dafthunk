import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { testImageData } from "../../../test/fixtures/image-fixtures";
import { PhotonFitNode } from "./photon-fit-node";

describe("PhotonFitNode", () => {
  const makeContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "photon-fit",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should fit into a non-square container with transparent padding", async () => {
    const node = new PhotonFitNode({ nodeId: "photon-fit" } as unknown as Node);

    const result = await node.execute(
      makeContext({ image: testImageData, width: 256, height: 64 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.image).toBeDefined();
    expect(result.outputs?.image.mimeType).toBe("image/png");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });

  it("should fit into a square container", async () => {
    const node = new PhotonFitNode({ nodeId: "photon-fit" } as unknown as Node);

    const result = await node.execute(
      makeContext({ image: testImageData, width: 128, height: 128 })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });

  it("should upscale when allowUpscale is true", async () => {
    const node = new PhotonFitNode({ nodeId: "photon-fit" } as unknown as Node);

    const result = await node.execute(
      makeContext({
        image: testImageData,
        width: 512,
        height: 512,
        allowUpscale: true,
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });

  it("should reject a non-positive dimension", async () => {
    const node = new PhotonFitNode({ nodeId: "photon-fit" } as unknown as Node);

    const result = await node.execute(
      makeContext({ image: testImageData, width: 0, height: 128 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Width must be a positive number.");
  });

  it("should handle missing image", async () => {
    const node = new PhotonFitNode({ nodeId: "photon-fit" } as unknown as Node);

    const result = await node.execute(makeContext({ width: 128, height: 128 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Input image is missing or invalid.");
  });
});
