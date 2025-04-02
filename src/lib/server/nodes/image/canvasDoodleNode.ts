import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { ImageValue, StringValue, NumberValue } from "../types";
import { NodeType } from "../types";

/**
 * CanvasDoodle node implementation
 * This node provides a canvas widget that allows users to draw and outputs the drawing as an image.
 */
export class CanvasDoodleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "canvas-doodle",
    name: "Canvas Doodle",
    type: "canvas-doodle",
    description: "A canvas widget for drawing and sketching",
    category: "Image",
    icon: "pencil",
    inputs: [
      {
        name: "value",
        type: ImageValue,
        description: "Current canvas drawing as an image reference",
        hidden: true,
        value: new ImageValue(null), // Default null
      },
      {
        name: "width",
        type: NumberValue,
        description: "Canvas width in pixels",
        hidden: true,
        value: new NumberValue(300),
      },
      {
        name: "height",
        type: NumberValue,
        description: "Canvas height in pixels",
        hidden: true,
        value: new NumberValue(300),
      },
      {
        name: "strokeColor",
        type: StringValue,
        description: "Color of the drawing stroke",
        hidden: true,
        value: new StringValue("#000000"),
      },
      {
        name: "strokeWidth",
        type: NumberValue,
        description: "Width of the drawing stroke",
        hidden: true,
        value: new NumberValue(2),
      },
    ],
    outputs: [
      {
        name: "image",
        type: ImageValue,
        description: "The canvas drawing as an image",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      // Get the raw value from the RuntimeParameterValue
      const value = context.inputs.value?.getValue?.() ?? context.inputs.value;
      
      // If no value is provided, return an empty image
      if (!value) {
        return this.createSuccessResult({
          image: new ImageValue(null),
        });
      }


      // Check if the value is an object
      if (typeof value !== 'object') {
        return this.createErrorResult(
          `Invalid input type: expected object, got ${typeof value}`
        );
      }

      // Pass the value directly to the ImageValue constructor
      // The ImageValue class will validate the value format
      return this.createSuccessResult({
        image: new ImageValue(value),
      });
    } catch (error) {
      // Return a clean error message without logging
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error in CanvasDoodleNode"
      );
    }
  }
}
