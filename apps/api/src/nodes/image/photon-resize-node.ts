import { PhotonImage, resize, SamplingFilter } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node resizes an input image to a specified width and height using the Photon library.
 */
export class PhotonResizeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-resize",
    name: "Photon Image Resize",
    type: "photon-resize",
    description:
      "Resizes an image to the specified width and height using Photon.",
    category: "Image",
    icon: "maximize-2",
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to resize.",
        required: true,
      },
      {
        name: "width",
        type: "number",
        description: "Target width in pixels for the resized image.",
        required: true,
        value: 640,
      },
      {
        name: "height",
        type: "number",
        description: "Target height in pixels for the resized image.",
        required: true,
        value: 480,
      },
      {
        name: "samplingFilter",
        type: "string",
        description: "The sampling filter to use for resizing.",
        value: "Nearest", // "Nearest", "Triangle", "CatmullRom", "Gaussian", "Lanczos3"
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The resized image (WebP format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      width?: number;
      height?: number;
      samplingFilter?: keyof typeof SamplingFilter;
    };

    const { image, width, height } = inputs;
    const filterName = inputs.samplingFilter || "Nearest";

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof width !== "number" || width <= 0) {
      return this.createErrorResult("Width must be a positive number.");
    }
    if (typeof height !== "number" || height <= 0) {
      return this.createErrorResult("Height must be a positive number.");
    }

    // Map string filter name to SamplingFilter enum
    const selectedFilter: SamplingFilter =
      SamplingFilter[filterName] !== undefined
        ? SamplingFilter[filterName]
        : SamplingFilter.Nearest;

    let inputPhotonImage: PhotonImage | undefined;
    let outputPhotonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      inputPhotonImage = PhotonImage.new_from_byteslice(image.data);

      // Resize the image
      outputPhotonImage = resize(
        inputPhotonImage,
        width,
        height,
        selectedFilter
      );

      // Get the resized image bytes in WebP format
      const outputBytes = outputPhotonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon resizing resulted in empty image data."
        );
      }

      const resizedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: resizedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image resizing.";
      console.error(`[PhotonResizeNode] Error: ${errorMessage}`, error);
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
