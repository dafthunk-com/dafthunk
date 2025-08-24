import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * ResNet-50 node implementation for image classification
 */
export class Resnet50Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "resnet-50",
    name: "Image Classification (ResNet)",
    type: "resnet-50",
    description:
      "Classifies images using the ResNet-50 model trained on ImageNet",
    tags: ["Image", "AI"],
    icon: "image",
    documentation: `This node classifies images using the ResNet-50 model trained on ImageNet dataset.

## Usage Example

- **Input**: An image file (PNG, JPEG, etc.)
- **Output**: 
\`\`\`
{
  "classifications": [
    {"label": "golden retriever", "confidence": 0.95},
    {"label": "Labrador retriever", "confidence": 0.03},
    {"label": "tennis ball", "confidence": 0.01}
  ]
}
\`\`\`

The node identifies objects in the image and provides confidence scores for each classification.`,
    computeCost: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The image to classify",
        required: true,
      },
    ],
    outputs: [
      {
        name: "classifications",
        type: "json",
        description:
          "JSON object with predicted classes with confidence scores",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const { image } = context.inputs;

      // Run the ResNet-50 model for image classification
      const result = await context.env.AI.run(
        "@cf/microsoft/resnet-50",
        {
          image: Array.from(image.data),
        },
        context.env.AI_OPTIONS
      );

      return this.createSuccessResult({
        classifications: result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
