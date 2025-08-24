import { crop, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node crops an input image to a specified rectangle using the Photon library.
 */
export class PhotonCropNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-crop",
    name: "Image Crop",
    type: "photon-crop",
    description: "Crops an image to the specified rectangle using Photon.",
    tags: ["Image"],
    icon: "crop",
    documentation: `This node crops an image to the specified rectangle using Photon.

## Usage Example

- **Input**: 
\`\`\`
{
  "image": [image data],
  "x": 100,
  "y": 50,
  "width": 300,
  "height": 200
}
\`\`\`
- **Output**: \`[cropped image data in PNG format]\``,
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to crop.",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description:
          "The x-coordinate of the top-left corner of the crop area.",
        required: true,
        value: 0,
      },
      {
        name: "y",
        type: "number",
        description:
          "The y-coordinate of the top-left corner of the crop area.",
        required: true,
        value: 0,
      },
      {
        name: "width",
        type: "number",
        description: "The width of the crop area.",
        required: true,
        value: 100,
      },
      {
        name: "height",
        type: "number",
        description: "The height of the crop area.",
        required: true,
        value: 100,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The cropped image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    };

    const { image, x, y, width, height } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof x !== "number" || x < 0) {
      return this.createErrorResult("x must be a non-negative number.");
    }
    if (typeof y !== "number" || y < 0) {
      return this.createErrorResult("y must be a non-negative number.");
    }
    if (typeof width !== "number" || width <= 0) {
      return this.createErrorResult("Width must be a positive number.");
    }
    if (typeof height !== "number" || height <= 0) {
      return this.createErrorResult("Height must be a positive number.");
    }

    let inputPhotonImage: PhotonImage | undefined;
    let outputPhotonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      inputPhotonImage = PhotonImage.new_from_byteslice(image.data);

      // Calculate the bottom-right coordinates for Photon's crop function
      const x1_photon = x;
      const y1_photon = y;
      const x2_photon = x + width;
      const y2_photon = y + height;

      // Validate crop dimensions against image dimensions
      if (x2_photon > inputPhotonImage.get_width()) {
        return this.createErrorResult(
          "Crop area (x + width) exceeds image width."
        );
      }
      if (y2_photon > inputPhotonImage.get_height()) {
        return this.createErrorResult(
          "Crop area (y + height) exceeds image height."
        );
      }

      // Photon's crop function expects (img, x1, y1, x2, y2)
      outputPhotonImage = crop(
        inputPhotonImage,
        x1_photon,
        y1_photon,
        x2_photon,
        y2_photon
      );

      // Get the cropped image bytes in PNG format
      const outputBytes = outputPhotonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon cropping resulted in empty image data."
        );
      }

      const croppedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png", // Photon outputs PNG by default after crop
      };

      return this.createSuccessResult({ image: croppedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image cropping.";
      console.error(`[PhotonCropNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (inputPhotonImage) {
        inputPhotonImage.free();
      }
      if (outputPhotonImage) {
        outputPhotonImage.free();
      }
    }
  }
}
