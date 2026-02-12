import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class ImageUrlLoaderNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "image-url-loader",
    name: "Image URL Loader",
    type: "image-url-loader",
    description: "Loads an image from a URL and converts it to a data array",
    tags: ["Image", "Load", "URL"],
    icon: "link",
    documentation:
      "This node loads an image from a URL and converts it to a data array.",
    usage: 10,
    inputs: [
      {
        name: "url",
        type: "string",
        description: "The URL of the PNG image to load",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The image data as a binary array",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { url } = context.inputs;

      if (!url || typeof url !== "string") {
        return this.createErrorResult("URL is required and must be a string");
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (_) {
        return this.createErrorResult("Invalid URL format");
      }

      try {
        // Fetch the image from the URL
        const response = await fetch(url);

        if (!response.ok) {
          return this.createErrorResult(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          );
        }

        // Check content type to ensure it's an image
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.startsWith("image/")) {
          return this.createErrorResult(
            `URL does not point to an image (content-type: ${contentType})`
          );
        }

        // Get the image data as an ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();

        // Convert ArrayBuffer to Uint8Array
        const imageData = new Uint8Array(arrayBuffer);

        return this.createSuccessResult({
          image: {
            data: imageData,
            mimeType: "image/png",
          },
        });
      } catch (error) {
        return this.createErrorResult(
          error instanceof Error
            ? `Error fetching image: ${error.message}`
            : "Unknown error fetching image"
        );
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
