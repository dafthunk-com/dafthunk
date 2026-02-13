import { env } from "cloudflare:test";
import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { testImageData } from "../../../test/fixtures/image-fixtures";
import { Resnet50Node } from "./resnet-50-node";

describe("Resnet50Node", () => {
  it("should classify an image", async () => {
    const nodeId = "resnet-50";
    const node = new Resnet50Node({
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
    expect(result.outputs?.classifications).toBeDefined();
    expect(Array.isArray(result.outputs?.classifications)).toBe(true);
    expect(result.outputs?.classifications.length).toBeGreaterThan(0);

    // Check that classifications have the expected structure
    const firstClassification = result.outputs?.classifications[0];
    expect(firstClassification).toHaveProperty("label");
    expect(firstClassification).toHaveProperty("score");
    expect(typeof firstClassification.label).toBe("string");
    expect(typeof firstClassification.score).toBe("number");
  });
});
