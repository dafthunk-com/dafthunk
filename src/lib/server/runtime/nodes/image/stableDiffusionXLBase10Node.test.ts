import { describe, it, expect, vi } from "vitest";
import { StableDiffusionXLBase10Node } from "./stableDiffusionXLBase10Node";
import { Node } from "../../workflowTypes";

describe("StableDiffusionXLBase10Node", () => {
  const mockNode: Node = {
    id: "test-id",
    name: "Test Stable Diffusion XL",
    type: "stable-diffusion-xl-base",
    position: { x: 0, y: 0 },
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image to generate",
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Text describing elements to avoid in the generated image",
      },
      {
        name: "width",
        type: "number",
        description: "Width of the generated image (256-2048)",
        value: 1024,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the generated image (256-2048)",
        value: 1024,
      },
      {
        name: "num_steps",
        type: "number",
        description: "Number of diffusion steps (max 20)",
        value: 20,
      },
      {
        name: "guidance",
        type: "number",
        description: "Controls how closely the image follows the prompt",
        value: 7.5,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for reproducible results",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
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
    const mockAIRun = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

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
    expect(result.outputs).toEqual({
      image: {
        data: [1, 2, 3, 4],
        mimeType: "image/jpeg",
      },
    });
  });

  it("should generate image with all optional parameters", async () => {
    const mockAIRun = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

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
    expect(result.outputs).toEqual({
      image: {
        data: [1, 2, 3, 4],
        mimeType: "image/jpeg",
      },
    });
  });

  it("should clamp width and height values within valid range", async () => {
    const mockAIRun = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

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
    expect(result.outputs).toEqual({
      image: {
        data: [1, 2, 3, 4],
        mimeType: "image/jpeg",
      },
    });
  });

  it("should clamp num_steps to maximum value of 20", async () => {
    const mockAIRun = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

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
    expect(result.outputs).toEqual({
      image: {
        data: [1, 2, 3, 4],
        mimeType: "image/jpeg",
      },
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
});
