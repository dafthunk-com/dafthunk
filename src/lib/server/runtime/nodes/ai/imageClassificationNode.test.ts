import { describe, it, expect, vi } from "vitest";
import { ImageClassificationNode } from "./imageClassificationNode";
import { Node } from "../../workflowTypes";

describe("ImageClassificationNode", () => {
  const mockNode: Node = {
    id: "test-id",
    name: "Test Image Classification",
    type: "image-classification",
    position: { x: 0, y: 0 },
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The image to use for object detection",
      },
    ],
    outputs: [
      {
        name: "detections",
        type: "array",
        description:
          "Array of detected objects with scores, labels, and bounding boxes",
      },
    ],
  };

  it("should return error if image is not provided", async () => {
    const node = new ImageClassificationNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Image is required");
  });

  it("should return error if AI service is not available", async () => {
    const node = new ImageClassificationNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        image: {
          data: new Uint8Array([1, 2, 3]),
          mimeType: "image/png",
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI service is not available");
  });

  it("should process image and return detections", async () => {
    const mockAIRun = vi.fn().mockResolvedValue([
      {
        score: 0.95,
        label: "person",
        box: {
          xmin: 10,
          ymin: 20,
          xmax: 100,
          ymax: 200,
        },
      },
    ]);

    const node = new ImageClassificationNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        image: {
          data: new Uint8Array([1, 2, 3]),
          mimeType: "image/png",
        },
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(mockAIRun).toHaveBeenCalledWith("@cf/facebook/detr-resnet-50", {
      image: [1, 2, 3],
    });
    expect(result.success).toBe(true);
    expect(result.outputs).toEqual({
      detections: [
        {
          score: 0.95,
          label: "person",
          box: {
            xmin: 10,
            ymin: 20,
            xmax: 100,
            ymax: 200,
          },
        },
      ],
    });
  });

  it("should handle errors during execution", async () => {
    const mockAIRun = vi
      .fn()
      .mockRejectedValue(new Error("image.data is not iterable"));

    const node = new ImageClassificationNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        image: {
          data: new Uint8Array([1, 2, 3]),
          mimeType: "image/png",
        },
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("image.data is not iterable");
  });
});
