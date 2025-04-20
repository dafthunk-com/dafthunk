import { describe, it, expect, vi } from "vitest";
import { Node } from "../../api/types";
import { NodeContext } from "../types";
import { DetrResnet50Node } from "./detrResnet50Node";

describe("DetrResnet50Node", () => {
  const mockNode: Node = {
    id: "test-id",
    name: "Test DETR-ResNet-50",
    type: "detr-resnet-50",
    position: { x: 0, y: 0 },
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The image to use for object detection",
        required: true,
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

  const mockEnv = {
    AI: {
      run: vi.fn(),
      toMarkdown: vi.fn(),
      aiGatewayLogId: "test-log-id",
      gateway: vi.fn().mockReturnValue({}),
      autorag: vi.fn().mockReturnValue({}),
      models: vi.fn().mockResolvedValue([]),
    },
  };

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

  it("should return error if image is not provided", async () => {
    const node = new DetrResnet50Node(mockNode);
    const context: NodeContext = {
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {},
      env: mockEnv,
    };
    const result = await node.execute(context);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Image is required");
  });

  it("should return error if AI service is not available", async () => {
    const node = new DetrResnet50Node(mockNode);
    const inputs = {
      image: {
        data: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
      },
    };
    const context: NodeContext = {
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs,
      env: { AI: undefined as any },
    };
    const result = await node.execute(context);

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI service is not available");
  });

  it("should process image and return detections", async () => {
    const node = new DetrResnet50Node(mockNode);
    const inputs = {
      image: {
        data: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
      },
    };
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRun,
    };
    const context: NodeContext = {
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs,
      env: { AI: mockAI },
    };
    const result = await node.execute(context);

    expect(mockAIRun).toHaveBeenCalledWith("@cf/facebook/detr-resnet-50", {
      image: [1, 2, 3],
    });
    expect(result.success).toBe(true);
    expect(result.outputs?.detections).toEqual([
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
  });

  it("should handle errors during execution", async () => {
    const mockAIRunError = vi
      .fn()
      .mockRejectedValue(new Error("Failed to process image"));

    const node = new DetrResnet50Node(mockNode);
    const inputs = {
      image: {
        data: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
      },
    };
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRunError,
    };
    const context: NodeContext = {
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs,
      env: { AI: mockAI },
    };
    const result = await node.execute(context);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to process image");
  });
});
