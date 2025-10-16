import { NodeExecution, NodeType } from "@dafthunk/types";
import ExifReader from "exifreader";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * Extracts EXIF data from an image using the ExifReader library.
 */
export class ExifReaderNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "exif-reader",
    name: "EXIF Reader",
    type: "exif-reader",
    description: "Extracts EXIF data from an image.",
    tags: ["Image"],
    icon: "file-text",
    documentation: "This node extracts EXIF data from an image.",
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to extract EXIF data from.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "data",
        type: "json",
        description: "EXIF data extracted from the image as a JSON string.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
    };

    const { image } = inputs;

    if (!image || !image.data) {
      return this.createErrorResult("Input image is missing or invalid.");
    }

    try {
      // ExifReader.load() expects a Buffer or ArrayBuffer.
      // Assuming image.data is Uint8Array, its .buffer property is ArrayBuffer.
      const tags = ExifReader.load(image.data.buffer);

      // Remove potentially very large MakerNote tag to avoid large JSON output
      if (tags["MakerNote"]) {
        delete tags["MakerNote"];
      }
      // Also remove thumbnail data if present
      // Add type assertion to handle complex type of tags["thumbnail"]
      const thumbnailTag = tags["thumbnail"] as any;
      if (thumbnailTag && thumbnailTag.image) {
        delete thumbnailTag.image;
      }

      return this.createSuccessResult({
        data: tags,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during EXIF data extraction.";
      console.error(`[ExifReaderNode] Error: ${errorMessage}`, error);
      if (error instanceof Error && error.message.includes("No Exif data")) {
        return this.createSuccessResult({
          exifData: "{}", // Return empty JSON if no EXIF data found
          imagePassthrough: image,
        });
      }
      return this.createErrorResult(errorMessage);
    }
  }
}
