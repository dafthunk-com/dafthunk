import { edge_detection, PhotonImage } from "@cf-wasm/photon";
import { ExecutableNode, ImageParameter, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * This node applies edge detection to an input image using the Photon library.
 */
export class PhotonEdgeDetectionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-edge-detection",
    name: "Edge Detection",
    type: "photon-edge-detection",
    description: "Highlights edges in an image using Photon.",
    tags: ["Image", "Photon", "Effect", "EdgeDetection"],
    icon: "minimize-2",
    documentation: "This node highlights edges in an image using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply edge detection to.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The edge-detected image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
    };

    const { image } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Apply edge detection
      edge_detection(photonImage);

      // Get the resulting image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon edge detection resulted in empty image data."
        );
      }

      const effectedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: effectedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image edge detection.";
      console.error(`[PhotonEdgeDetectionNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
