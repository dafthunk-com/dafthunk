import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { ImageValue, StringValue, NumberValue } from "../types";
import { NodeType } from "../types";

/**
 * Webcam node implementation
 * This node provides a webcam widget that allows users to capture images and outputs them as an image reference.
 */
export class WebcamNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "webcam",
    name: "Webcam",
    type: "webcam",
    description: "A webcam widget for capturing images",
    category: "Image",
    icon: "camera",
    inputs: [
      {
        name: "value",
        type: ImageValue,
        description: "Current captured image as an image reference",
        hidden: true,
        value: new ImageValue({ data: new Uint8Array(0), mimeType: "image/png" }),
      },
      {
        name: "width",
        type: NumberValue,
        description: "Image width in pixels",
        hidden: true,
        value: new NumberValue(640),
      },
      {
        name: "height",
        type: NumberValue,
        description: "Image height in pixels",
        hidden: true,
        value: new NumberValue(480),
      },
    ],
    outputs: [
      {
        name: "image",
        type: ImageValue,
        description: "The captured image as an image reference",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      // CRITICAL: Look up this node's definition in the workflow to get the saved input value
      // console.log("WebcamNode execute - Context:", {
      //   nodeId: context.nodeId,
      //   workflowId: context.workflowId,
      //   inputKeys: Object.keys(context.inputs)
      // });
      
      // Get the raw input value
      const value = context.inputs.value;
      
      // console.log(`WebcamNode execute - Input value from context:`, value);
      
      // If no value is provided, or value is invalid, return empty data
      if (!value) {
        // console.log("WebcamNode execute - No value provided, returning empty image data");
        
        // Return an empty image data object with valid format
        const emptyImageData = {
          data: new Uint8Array(0),
          mimeType: "image/png"
        };
        
        const emptyImageValue = new ImageValue(emptyImageData);
        // console.log(`WebcamNode execute - Empty ImageValue validation: ${JSON.stringify(emptyImageValue.validate())}`);
        
        return this.createSuccessResult({
          image: emptyImageValue,
        });
      }

      // If the value is an object reference with id and mimeType
      if (typeof value === 'object' && value.id !== undefined && value.mimeType) {
        // console.log(`WebcamNode execute - Object reference detected: ${JSON.stringify(value)}`);
        
        // Handle empty string id (special case for cleared image)
        if (value.id === "") {
          // console.log("WebcamNode execute - Empty reference (cleared image) detected");
          // Return an empty image data object
          const emptyImageData = {
            data: new Uint8Array(0),
            mimeType: "image/png"
          };
          
          const emptyImageValue = new ImageValue(emptyImageData);
          // console.log(`WebcamNode execute - Empty ImageValue validation: ${JSON.stringify(emptyImageValue.validate())}`);
          
          return this.createSuccessResult({
            image: emptyImageValue,
          });
        }
        
        // Validate mimeType
        if (!value.mimeType.startsWith("image/")) {
          // console.log(`WebcamNode execute - Invalid mimeType: ${value.mimeType}`);
          throw new Error(`Invalid mimeType for image: ${value.mimeType}`);
        }
        
        // Create an ImageValue from the object reference
        // console.log(`WebcamNode execute - Creating ImageValue from reference: ${JSON.stringify(value)}`);
        const imageValue = new ImageValue(value);
        // console.log(`WebcamNode execute - Created ImageValue from object reference`);
        
        // Validate the ImageValue
        const validation = imageValue.validate();
        // console.log(`WebcamNode execute - ImageValue validation: ${JSON.stringify(validation)}`);
        
        if (!validation.isValid) {
          // console.log(`WebcamNode execute - ImageValue validation failed: ${validation.error}`);
          throw new Error(validation.error || "Invalid image data");
        }
        
        // console.log("WebcamNode execute - Returning valid ImageValue with object reference");
        return this.createSuccessResult({
          image: imageValue,
        });
      }
      
      // If the value is a data object with mimeType
      if (typeof value === 'object' && value.data !== undefined && value.mimeType) {
        // console.log(`WebcamNode execute - Data object detected with mimeType: ${value.mimeType}`);
        
        // Validate mimeType
        if (!value.mimeType.startsWith("image/")) {
          // console.log(`WebcamNode execute - Invalid mimeType in data object: ${value.mimeType}`);
          throw new Error(`Invalid mimeType for image: ${value.mimeType}`);
        }
        
        // Create an ImageValue from the data object
        const imageValue = new ImageValue(value);
        // console.log("WebcamNode execute - Created ImageValue from data object");
        
        // Validate the ImageValue
        const validation = imageValue.validate();
        // console.log(`WebcamNode execute - ImageValue validation: ${JSON.stringify(validation)}`);
        
        if (!validation.isValid) {
          // console.log(`WebcamNode execute - ImageValue validation failed: ${validation.error}`);
          throw new Error(validation.error || "Invalid image data");
        }
        
        // console.log("WebcamNode execute - Returning valid ImageValue from data object");
        return this.createSuccessResult({
          image: imageValue,
        });
      }
      
      // If we get here, the value is not in a recognized format
      // console.log(`WebcamNode execute - Unrecognized input format: ${JSON.stringify(value)}`);
      throw new Error("Unrecognized input format for webcam node");
    } catch (error) {
      // console.log(`WebcamNode execute - Error: ${error}`);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error in WebcamNode"
      );
    }
  }
}
