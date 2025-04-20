import { describe, it, expect, vi } from "vitest";
import { Node } from "../../api/types";
import { NodeContext } from "../types";
import { StableDiffusionXLBase10Node } from "./stableDiffusionXLBase10Node";

describe("StableDiffusionXLBase10Node", () => {
  const mockNode: Node = {
    id: "test-id",
    name: "Test Stable Diffusion XL",
    type: "stable-diffusion-xl-base",
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image to generate",
        required: true,
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Text describing elements to avoid in the generated image",
        hidden: true,
      },
      {
        name: "width",
        type: "number",
        description: "Width of the generated image (256-2048)",
        value: 1024,
        hidden: true,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the generated image (256-2048)",
        value: 1024,
        hidden: true,
      },
      {
        name: "num_steps",
        type: "number",
        description: "Number of diffusion steps (max 20)",
        value: 20,
        hidden: true,
      },
      {
        name: "guidance",
        type: "number",
        description: "Controls how closely the image follows the prompt",
        value: 7.5,
        hidden: true,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for reproducible results",
        hidden: true,
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

  const createContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-id",
    workflowId: "test-workflow",
    inputs,
    env: mockEnv,
  });

  it("should return error if prompt is not provided", async () => {
    const node = new StableDiffusionXLBase10Node(mockNode);
    const result = await node.execute(createContext({}));

    expect(result.success).toBe(false);
    expect(result.error).toBe("Prompt is required");
  });

  it("should return error if AI service is not available", async () => {
    const node = new StableDiffusionXLBase10Node(mockNode);
    const context: NodeContext = {
      nodeId: "test-id",
      workflowId: "test-workflow",
      inputs: { prompt: "a beautiful sunset over mountains" },
      env: { AI: undefined as any },
    };
    const result = await node.execute(context);

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI service is not available");
  });

  it("should generate image with minimal required inputs", async () => {
    const mockImageData = new Uint8Array([1, 2, 3, 4]);
    const mockAIRun = vi.fn().mockResolvedValue(mockImageData);
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRun,
    };

    const node = new StableDiffusionXLBase10Node(mockNode);
    const context = createContext({
      prompt: "a beautiful sunset over mountains",
    });
    context.env.AI = mockAI;
    const result = await node.execute(context);

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
    expect(result.outputs?.image).toEqual({
      data: mockImageData,
      mimeType: "image/jpeg",
    });
  });

  it("should generate image with all optional parameters", async () => {
    const mockImageData = new Uint8Array([1, 2, 3, 4]);
    const mockAIRun = vi.fn().mockResolvedValue(mockImageData);
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRun,
    };
    const node = new StableDiffusionXLBase10Node(mockNode);
    const context = createContext({
      prompt: "a beautiful sunset over mountains",
      negative_prompt: "blurry, low quality",
      width: 512,
      height: 768,
      num_steps: 15,
      guidance: 8.5,
      seed: 12345,
    });
    context.env.AI = mockAI;
    const result = await node.execute(context);

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
    expect(result.outputs?.image).toEqual({
      data: mockImageData,
      mimeType: "image/jpeg",
    });
  });

  it("should clamp width and height values within valid range", async () => {
    const mockImageData = new Uint8Array([1, 2, 3, 4]);
    const mockAIRun = vi.fn().mockResolvedValue(mockImageData);
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRun,
    };

    const node = new StableDiffusionXLBase10Node(mockNode);
    const context = createContext({
      prompt: "a beautiful sunset over mountains",
      width: 3000,
      height: 100,
    });
    context.env.AI = mockAI;
    const result = await node.execute(context);

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
    expect(result.outputs?.image).toEqual({
      data: mockImageData,
      mimeType: "image/jpeg",
    });
  });

  it("should clamp num_steps to maximum value of 20", async () => {
    const mockImageData = new Uint8Array([1, 2, 3, 4]);
    const mockAIRun = vi.fn().mockResolvedValue(mockImageData);
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRun,
    };

    const node = new StableDiffusionXLBase10Node(mockNode);
    const context = createContext({
      prompt: "a beautiful sunset over mountains",
      num_steps: 30,
    });
    context.env.AI = mockAI;
    const result = await node.execute(context);

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
    expect(result.outputs?.image).toEqual({
      data: mockImageData,
      mimeType: "image/jpeg",
    });
  });

  it("should handle errors during execution", async () => {
    const mockAIRunError = vi
      .fn()
      .mockRejectedValue(new Error("Generation failed"));
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRunError,
    };

    const node = new StableDiffusionXLBase10Node(mockNode);
    const context = createContext({
      prompt: "a beautiful sunset over mountains",
    });
    context.env.AI = mockAI;
    const result = await node.execute(context);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Generation failed");
  });

  it("should handle empty image data from API", async () => {
    const mockAIRun = vi.fn().mockResolvedValue(new Uint8Array(0));
    const mockAI = {
      ...mockEnv.AI,
      run: mockAIRun,
    };

    const node = new StableDiffusionXLBase10Node(mockNode);
    const context = createContext({
      prompt: "a beautiful sunset over mountains",
    });
    context.env.AI = mockAI;
    const result = await node.execute(context);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Received empty image data from the API");
  });
});
