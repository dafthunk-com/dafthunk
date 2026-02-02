import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { testImageData } from "../../../test/fixtures/image-fixtures";
import { NodeContext } from "../../runtime/node-types";
import { ExifReaderNode } from "./exif-reader-node";

describe("ExifReaderNode", () => {
  it("should extract EXIF data from image", async () => {
    const nodeId = "exif-reader";
    const node = new ExifReaderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.data).toBeDefined();
    expect(typeof result.outputs?.data).toBe("object");
  });

  it("should handle missing image", async () => {
    const nodeId = "exif-reader";
    const node = new ExifReaderNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Input image is missing or invalid");
  });

  it("should handle image without EXIF data", async () => {
    const nodeId = "exif-reader";
    const node = new ExifReaderNode({
      nodeId,
    } as unknown as Node);

    // Create a simple image without EXIF data
    const simpleImageData = {
      data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), // PNG header only
      mimeType: "image/png",
    };

    const context = {
      nodeId,
      inputs: {
        image: simpleImageData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    // Should still complete successfully even without EXIF data
    expect(result.status).toBe("completed");
    expect(result.outputs?.data).toBeDefined();
  });
});
