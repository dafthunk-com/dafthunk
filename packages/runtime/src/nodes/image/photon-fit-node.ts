import {
  type PhotonImage,
  padding_bottom,
  padding_left,
  padding_right,
  padding_top,
  Rgba,
  resize,
  SamplingFilter,
} from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node scales an image to fit inside a fixed-size container while
 * preserving its aspect ratio (CSS `object-fit: contain`), then centers it
 * with transparent padding so the output is exactly the requested size.
 *
 * The image is shrunk along whichever axis is the tighter constraint, and the
 * leftover space on the other axis becomes transparent padding.
 */
export class PhotonFitNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    width: z
      .number({ error: "Width must be a positive number." })
      .int({ error: "Width must be a whole number of pixels." })
      .positive({ error: "Width must be a positive number." }),
    height: z
      .number({ error: "Height must be a positive number." })
      .int({ error: "Height must be a whole number of pixels." })
      .positive({ error: "Height must be a positive number." }),
    allowUpscale: z.boolean().catch(false),
    samplingFilter: z
      .enum(["Nearest", "Triangle", "CatmullRom", "Gaussian", "Lanczos3"])
      .catch("Lanczos3"),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-fit",
    name: "Image Fit",
    type: "photon-fit",
    description:
      "Scales an image to fit inside a fixed-size container while preserving aspect ratio, centering it with transparent padding.",
    tags: ["Image", "Photon", "Transform", "Fit"],
    icon: "scaling",
    documentation:
      "This node scales an image to fit inside a container of the given width and height while preserving its aspect ratio (like CSS object-fit: contain). The image is shrunk along whichever axis is the tighter constraint and centered, with the leftover space filled by transparent padding so the output is exactly the requested size. By default the image is only scaled down; enable Allow Upscale to also enlarge images smaller than the container.",
    inlinable: true,
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to fit into the container.",
        required: true,
      },
      {
        name: "width",
        type: "number",
        description: "Container width in pixels.",
        required: true,
        value: 256,
      },
      {
        name: "height",
        type: "number",
        description: "Container height in pixels.",
        required: true,
        value: 256,
      },
      {
        name: "allowUpscale",
        type: "boolean",
        description:
          "Whether to enlarge images smaller than the container (default: only shrink).",
        value: false,
      },
      {
        name: "samplingFilter",
        type: "string",
        description: "The sampling filter to use when resizing.",
        value: "Lanczos3", // "Nearest", "Triangle", "CatmullRom", "Gaussian", "Lanczos3"
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The fitted image at the container size (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonFitNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, width, height, allowUpscale, samplingFilter } = parsed.data;
    const selectedFilter: SamplingFilter = SamplingFilter[samplingFilter];

    return executePhotonOperation(this, image, (img) => {
      const srcWidth = img.get_width();
      const srcHeight = img.get_height();

      // Contain scale: the tighter axis decides the factor. Clamp to 1 unless
      // upscaling is allowed so small logos are not blown up by default.
      let scale = Math.min(width / srcWidth, height / srcHeight);
      if (!allowUpscale) {
        scale = Math.min(scale, 1);
      }
      const newWidth = Math.max(
        1,
        Math.min(width, Math.round(srcWidth * scale))
      );
      const newHeight = Math.max(
        1,
        Math.min(height, Math.round(srcHeight * scale))
      );

      // Resize, then center with transparent padding. Each padding function
      // returns a new PhotonImage, borrows its input, and consumes its Rgba
      // (moved into Rust), so a fresh Rgba is built per side. Every image
      // created here is freed; the original `img` is freed by the helper.
      const created: PhotonImage[] = [];
      let current = resize(img, newWidth, newHeight, selectedFilter);
      created.push(current);

      const padTop = Math.floor((height - newHeight) / 2);
      const padBottom = height - newHeight - padTop;
      const padLeft = Math.floor((width - newWidth) / 2);
      const padRight = width - newWidth - padLeft;

      const pad = (
        fn: (i: PhotonImage, p: number, c: Rgba) => PhotonImage,
        amount: number
      ) => {
        if (amount <= 0) return;
        current = fn(current, amount, new Rgba(0, 0, 0, 0));
        created.push(current);
      };

      try {
        pad(padding_top, padTop);
        pad(padding_bottom, padBottom);
        pad(padding_left, padLeft);
        pad(padding_right, padRight);
        return current.get_bytes();
      } finally {
        for (const created_image of created) created_image.free();
      }
    });
  }
}
