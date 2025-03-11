import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult } from "../../workflowTypes";
import { NodeContext } from "@lib/workflowRuntime.ts";

export class ImageClassificationNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const image = context.inputs.image;

      if (!image) {
        return this.createErrorResult("Image is required");
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Run the DETR-ResNet-50 model for object detection
      const result = await context.env.AI.run("@cf/facebook/detr-resnet-50", {
        image: [...image],
      });

      // The result should be an array of detected objects
      // Each object has score, label, and box properties
      // The box property contains xmin, ymin, xmax, ymax coordinates
      return this.createSuccessResult({
        detections: result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
