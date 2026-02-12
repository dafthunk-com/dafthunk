import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: DETR-ResNet-50 object detection
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.05,
  outputCostPerMillion: 0.05,
};

/**
 * DETR-ResNet-50 node implementation for object detection
 */
export class DetrResnet50Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "detr-resnet50",
    name: "Object Detection (DETR)",
    type: "detr-resnet50",
    description:
      "Detects and classifies objects in images using DETR-ResNet-50 model",
    tags: ["AI", "Image", "Cloudflare", "ObjectDetection"],
    icon: "image",
    documentation:
      "This node detects and locates objects in images using the DETR-ResNet-50 model with bounding box coordinates.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/detr-resnet-50/",
    usage: 1,
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
        type: "json",
        description:
          "JSON object with detected objects with scores, labels, and bounding boxes",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const image = context.inputs.image;

      if (!image) {
        return this.createErrorResult("Image is required");
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Run the DETR-ResNet-50 model for object detection
      // Note: This model is deprecated but may still work at runtime
      const detections = await context.env.AI.run(
        "@cf/facebook/detr-resnet-50" as keyof AiModels,
        {
          image: Array.from(image.data),
        },
        context.env.AI_OPTIONS
      );

      // Calculate usage based on image size
      // Estimate input as image bytes / 100 (rough approximation)
      const imageTokenEstimate = Math.ceil(image.data.length / 100);
      const usage = calculateTokenUsage(imageTokenEstimate, "", PRICING);

      return this.createSuccessResult({ detections }, usage);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
