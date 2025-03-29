import { ExecutableNode } from "../types";
import { ExecutionResult, NodeContext } from "../../runtime/types";
import { ArrayParameter, ImageParameter } from "../types";
import { NodeType } from "../types";

/**
 * ResNet-50 node implementation for image classification
 */
export class Resnet50Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "resnet-50",
    name: "ResNet-50",
    type: "resnet-50",
    description:
      "Classifies images using the ResNet-50 model trained on ImageNet",
    category: "Image",
    icon: "image",
    inputs: [
      {
        name: "image",
        type: ImageParameter,
        description: "The image to classify",
        required: true,
      },
    ],
    outputs: [
      {
        name: "classifications",
        type: ArrayParameter,
        description: "Array of predicted classes with confidence scores",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const { image } = context.inputs;

      // Run the ResNet-50 model for image classification
      const result = await context.env.AI.run("@cf/microsoft/resnet-50", {
        image: Array.from(image.data),
      });

      // The result should be an array of classifications
      // Each classification has score and label properties
      return this.createSuccessResult({
        classifications: new ArrayParameter(result),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
