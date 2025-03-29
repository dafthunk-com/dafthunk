import { describe, it, expect, vi } from "vitest";
import { StableDiffusionXLBase10Node } from "./stableDiffusionXLBase10Node";
import { Node } from "../../runtime/types";
import {
  StringParameter as StringRuntimeParameter,
  NumberParameter as NumberRuntimeParameter,
  ImageParameter as ImageRuntimeParameter,
} from "../../runtime/types";
import { ImageParameter as ImageNodeParameter } from "../types";

describe("StableDiffusionXLBase10Node", () => {
  const mockNode: Node = {
    id: "test-id",
    name: "Test Stable Diffusion XL",
    type: "stable-diffusion-xl-base",
    position: { x: 0, y: 0 },
    inputs: [
      {
        name: "prompt",
        type: StringRuntimeParameter,
        description: "Text description of the image to generate",
        required: true,
      },
      {
        name: "negative_prompt",
        type: StringRuntimeParameter,
        description: "Text describing elements to avoid in the generated image",
        hidden: true,
      },
      {
        name: "width",
        type: NumberRuntimeParameter,
        description: "Width of the generated image (256-2048)",
        value: new NumberRuntimeParameter(1024),
        hidden: true,
      },
      {
        name: "height",
        type: NumberRuntimeParameter,
        description: "Height of the generated image (256-2048)",
        value: new NumberRuntimeParameter(1024),
        hidden: true,
      },
      {
        name: "num_steps",
        type: NumberRuntimeParameter,
        description: "Number of diffusion steps (max 20)",
        value: new NumberRuntimeParameter(20),
        hidden: true,
      },
      {
        name: "guidance",
        type: NumberRuntimeParameter,
        description: "Controls how closely the image follows the prompt",
        value: new NumberRuntimeParameter(7.5),
        hidden: true,
      },
      {
        name: "seed",
        type: NumberRuntimeParameter,
        description: "Random seed for reproducible results",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: ImageRuntimeParameter,
        description: "The generated image",
      },
    ],
  };

  it("should return error if prompt is not provided", async () => {
    const node = new StableDiffusionXLBase10Node(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Prompt is required");
  });

  it("should return error if AI service is not available", async () => {
    const node = new StableDiffusionXLBase10Node(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        prompt: "a beautiful sunset over mountains",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI service is not available");
  });

  it("should generate image with minimal required inputs", async () => {
    const mockImageData = new Uint8Array([1, 2, 3, 4]);
    const mockAIRun = vi.fn().mockResolvedValue(mockImageData);

    const node = new StableDiffusionXLBase10Node(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        prompt: "a beautiful sunset over mountains",
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(mockAIRun).toHaveBeenCalledWith(
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      {
        prompt: "a beautiful sunset over mountains",
        width: 1024,
        height: 1024,
        num_steps: 20,
        guidance: 7.5,
      }
    );
    expect(result.success).toBe(true);
    expect(result.outputs?.image).toBeInstanceOf(ImageNodeParameter);
    expect(result.outputs?.image.getValue()).toEqual({
      data: mockImageData,
      mimeType: "image/jpeg",
    });
  });

  it("should generate image with all optional parameters", async () => {
    const mockImageData = new Uint8Array([1, 2, 3, 4]);
    const mockAIRun = vi.fn().mockResolvedValue(mockImageData);

    const node = new StableDiffusionXLBase10Node(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        prompt: "a beautiful sunset over mountains",
        negative_prompt: "blurry, low quality",
        width: 512,
        height: 768,
        num_steps: 15,
        guidance: 8.5,
        seed: 12345,
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(mockAIRun).toHaveBeenCalledWith(
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      {
        prompt: "a beautiful sunset over mountains",
        negative_prompt: "blurry, low quality",
        width: 512,
        height: 768,
        num_steps: 15,
        guidance: 8.5,
        seed: 12345,
      }
    );
    expect(result.success).toBe(true);
    expect(result.outputs?.image).toBeInstanceOf(ImageNodeParameter);
    expect(result.outputs?.image.getValue()).toEqual({
      data: mockImageData,
      mimeType: "image/jpeg",
    });
  });

  it("should clamp width and height values within valid range", async () => {
    const mockImageData = new Uint8Array([1, 2, 3, 4]);
    const mockAIRun = vi.fn().mockResolvedValue(mockImageData);

    const node = new StableDiffusionXLBase10Node(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        prompt: "a beautiful sunset over mountains",
        width: 3000, // Should be clamped to 2048
        height: 100, // Should be clamped to 256
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(mockAIRun).toHaveBeenCalledWith(
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      {
        prompt: "a beautiful sunset over mountains",
        width: 2048,
        height: 256,
        num_steps: 20,
        guidance: 7.5,
      }
    );
    expect(result.success).toBe(true);
    expect(result.outputs?.image).toBeInstanceOf(ImageNodeParameter);
    expect(result.outputs?.image.getValue()).toEqual({
      data: mockImageData,
      mimeType: "image/jpeg",
    });
  });

  it("should clamp num_steps to maximum value of 20", async () => {
    const mockImageData = new Uint8Array([1, 2, 3, 4]);
    const mockAIRun = vi.fn().mockResolvedValue(mockImageData);

    const node = new StableDiffusionXLBase10Node(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        prompt: "a beautiful sunset over mountains",
        num_steps: 30, // Should be clamped to 20
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(mockAIRun).toHaveBeenCalledWith(
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      {
        prompt: "a beautiful sunset over mountains",
        width: 1024,
        height: 1024,
        num_steps: 20,
        guidance: 7.5,
      }
    );
    expect(result.success).toBe(true);
    expect(result.outputs?.image).toBeInstanceOf(ImageNodeParameter);
    expect(result.outputs?.image.getValue()).toEqual({
      data: mockImageData,
      mimeType: "image/jpeg",
    });
  });

  it("should handle errors during execution", async () => {
    const mockAIRun = vi.fn().mockRejectedValue(new Error("Generation failed"));

    const node = new StableDiffusionXLBase10Node(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        prompt: "a beautiful sunset over mountains",
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Generation failed");
  });

  it("should handle empty image data from API", async () => {
    const mockAIRun = vi.fn().mockResolvedValue(new Uint8Array(0));

    const node = new StableDiffusionXLBase10Node(mockNode);
    const result = await node.execute({
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: {
        prompt: "a beautiful sunset over mountains",
      },
      env: {
        AI: {
          run: mockAIRun,
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Received empty image data from the API");
  });
});
