import { PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node extracts basic information (width, height, mime type, estimated filesize)
 * from an input image using the Photon library.
 */
export class PhotonImageInfoNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-image-info",
    name: "Image Info",
    type: "photon-image-info",
    description:
      "Extracts width, height, mime type, and estimated filesize from an image. Also passes the original image through.",
    tags: ["Image", "Photon", "Metadata"],
    icon: "info",
    documentation:
      "This node extracts width, height, mime type, and estimated filesize from an image. Also passes the original image through.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to get information from.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "width",
        type: "number",
        description: "Width of the image in pixels.",
      },
      {
        name: "height",
        type: "number",
        description: "Height of the image in pixels.",
      },
      {
        name: "mimeType",
        type: "string",
        description: "Mime type of the input image.",
      },
      {
        name: "estimatedFilesize", // in bytes
        type: "number",
        description: "Estimated filesize of the image in bytes (from Photon).",
      },
      {
        name: "imagePassthrough",
        type: "image",
        description:
          "The original image, passed through for further processing.",
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
      photonImage = PhotonImage.new_from_byteslice(image.data);

      const width = photonImage.get_width();
      const height = photonImage.get_height();
      const estimatedFilesizeBigInt = photonImage.get_estimated_filesize();
      const estimatedFilesize = Number(estimatedFilesizeBigInt); // Convert BigInt to Number
      const mimeType = image.mimeType; // Get mimeType from input

      return this.createSuccessResult({
        width,
        height,
        mimeType,
        estimatedFilesize,
        imagePassthrough: image, // Pass the original image data through
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image info extraction.";
      console.error(`[PhotonImageInfoNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
