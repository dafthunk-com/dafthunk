import { describe, it, expect, vi } from "vitest";
import { ImageClassificationNode } from "./imageClassificationNode";
import { Node } from "../../workflowModel";

describe("ImageClassificationNode", () => {
  const mockNode: Node = {
    id: "test-id",
    name: "Test Image Classification",
    type: "image-classification",
    position: { x: 0, y: 0 },
    inputValues: [
      {
        name: "image",
        type: "binary",
      },
    ],
    outputValues: [
      {
        name: "detections",
        type: "array",
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
        image: new Uint8Array([1, 2, 3]),
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
        image: new Uint8Array([1, 2, 3]),
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(mockAIRun).toHaveBeenCalledWith("@cf/facebook/detr-resnet-50", {
      image: expect.any(Uint8Array),
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
    const mockAIRun = vi.fn().mockRejectedValue(new Error("API error"));

    const node = new ImageClassificationNode(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        image: new Uint8Array([1, 2, 3]),
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("API error");
  });
});
