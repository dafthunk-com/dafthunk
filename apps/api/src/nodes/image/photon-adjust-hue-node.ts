import { hue_rotate_hsl, PhotonImage } from "@cf-wasm/photon";
import { ExecutableNode, ImageParameter, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * This node adjusts the hue of an input image using the HSL color space via Photon library.
 */
export class PhotonAdjustHueNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-adjust-hue",
    name: "Adjust Hue (HSL)",
    type: "photon-adjust-hue",
    description:
      "Adjusts image hue using HSL. Degrees from 0 to 360 for hue rotation.",
    tags: ["Image", "Photon", "Adjust", "Hue"],
    icon: "rotate-3d",
    documentation:
      "This node adjusts image hue using HSL. Degrees from 0 to 360 for hue rotation.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to adjust hue.",
        required: true,
      },
      {
        name: "degrees",
        type: "number",
        description: "Hue rotation angle in degrees (0 to 360).",
        required: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The hue-adjusted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      degrees?: number;
    };

    const { image, degrees } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof degrees !== "number") {
      // Photon's hue_rotate_hsl takes an f32. While any number works, typically it's 0-360.
      // No strict validation here, as Photon might handle wrapping or other values gracefully.
      return this.createErrorResult("Hue rotation degrees must be a number.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Adjust hue using HSL
      hue_rotate_hsl(photonImage, degrees);

      // Get the adjusted image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon hue adjustment resulted in empty image data."
        );
      }

      const adjustedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: adjustedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image hue adjustment.";
      console.error(`[PhotonAdjustHueNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
