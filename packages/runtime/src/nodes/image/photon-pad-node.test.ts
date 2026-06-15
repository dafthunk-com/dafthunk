import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { testImageData } from "../../../test/fixtures/image-fixtures";
import { PhotonPadNode } from "./photon-pad-node";

describe("PhotonPadNode", () => {
  const makeContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "photon-pad",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should pad the image on the top with transparent fill", async () => {
    const node = new PhotonPadNode({ nodeId: "photon-pad" } as unknown as Node);

    const result = await node.execute(
      makeContext({
        image: testImageData,
        top: 16,
        bottom: 0,
        left: 0,
        right: 0,
        fillRed: 0,
        fillGreen: 0,
        fillBlue: 0,
        fillAlpha: 0,
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.image).toBeDefined();
    expect(result.outputs?.image.mimeType).toBe("image/png");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });

  it("should pad the image on all sides", async () => {
    const node = new PhotonPadNode({ nodeId: "photon-pad" } as unknown as Node);

    const result = await node.execute(
      makeContext({
        image: testImageData,
        top: 8,
        bottom: 8,
        left: 8,
        right: 8,
        fillRed: 255,
        fillGreen: 255,
        fillBlue: 255,
        fillAlpha: 255,
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });

  it("should error when no padding is requested", async () => {
    const node = new PhotonPadNode({ nodeId: "photon-pad" } as unknown as Node);

    const result = await node.execute(
      makeContext({
        image: testImageData,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        fillRed: 0,
        fillGreen: 0,
        fillBlue: 0,
        fillAlpha: 0,
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("greater than zero");
  });

  it("should handle missing image", async () => {
    const node = new PhotonPadNode({ nodeId: "photon-pad" } as unknown as Node);

    const result = await node.execute(
      makeContext({
        top: 16,
        bottom: 0,
        left: 0,
        right: 0,
        fillRed: 0,
        fillGreen: 0,
        fillBlue: 0,
        fillAlpha: 0,
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Input image is missing or invalid.");
  });
});
