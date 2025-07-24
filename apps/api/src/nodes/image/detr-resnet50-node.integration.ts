import { Node } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { testImageData } from "../../../test/fixtures/image-fixtures";
import { NodeContext } from "../types";
import { DetrResnet50Node } from "./detr-resnet50-node";

describe("DetrResnet50Node", () => {
  it("should detect objects in an image", async () => {
    const nodeId = "detr-resnet50";
    const node = new DetrResnet50Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        image: testImageData,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.detections).toBeDefined();
    expect(Array.isArray(result.outputs?.detections)).toBe(true);

    // Check that detections have the expected structure
    if (result.outputs?.detections.length > 0) {
      const firstDetection = result.outputs?.detections[0];
      expect(firstDetection).toHaveProperty("label");
      expect(firstDetection).toHaveProperty("score");
      expect(firstDetection).toHaveProperty("bbox");
      expect(typeof firstDetection.label).toBe("string");
      expect(typeof firstDetection.score).toBe("number");
      expect(Array.isArray(firstDetection.bbox)).toBe(true);
      expect(firstDetection.bbox.length).toBe(4); // x, y, width, height
    }
  });
});
