import { PhotonImage } from "@cf-wasm/photon";
import { Resvg, type ResvgRenderOptions } from "@cf-wasm/resvg";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { detectFontSlugs, loadFonts, svgHasText } from "../../utils/fonts";

const OUTPUT_FORMATS = ["png", "webp", "jpeg"] as const;
type OutputFormat = (typeof OUTPUT_FORMATS)[number];

const MIME_BY_FORMAT: Record<OutputFormat, string> = {
  png: "image/png",
  webp: "image/webp",
  jpeg: "image/jpeg",
};

/**
 * Renders SVG content to a raster image (PNG, WebP, or JPEG).
 *
 * Text is rendered with fonts auto-detected from the SVG's `font-family`
 * references and loaded from the STATIC bucket — resvg has no system fonts in
 * the Workers runtime. Non-PNG output is encoded from resvg's PNG via Photon.
 */
export class SvgToPngNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "svg-to-png",
    name: "SVG to Image",
    type: "svg-to-png",
    description:
      "Renders SVG to PNG, WebP, or JPEG. Text uses fonts auto-detected from the SVG and loaded from the static asset store.",
    tags: ["Image", "SVG", "Convert", "PNG", "WebP"],
    icon: "file-image",
    documentation:
      "Renders SVG content to a raster image. Fonts referenced by the SVG's font-family are detected automatically and loaded from the static asset store, so text renders correctly. Leave the background transparent (default) to preserve the SVG's alpha channel.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "svg",
        type: "image",
        description: "The SVG image to render.",
        required: true,
      },
      {
        name: "format",
        type: "string",
        description: "Output format: 'png', 'webp', or 'jpeg'.",
        required: false,
        value: "png",
      },
      {
        name: "width",
        type: "number",
        description: "Output width in pixels (optional).",
        required: false,
      },
      {
        name: "height",
        type: "number",
        description: "Output height in pixels (optional).",
        required: false,
      },
      {
        name: "scale",
        type: "number",
        description: "Scale factor for rendering (default: 1.0).",
        required: false,
        value: 1.0,
        hidden: true,
      },
      {
        name: "backgroundColor",
        type: "string",
        description:
          "Background color (e.g., '#FF0000', 'white'). Leave 'transparent' to keep the alpha channel.",
        required: false,
        value: "transparent",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The rendered raster image.",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { inputs } = context;

    try {
      // Validate required input
      const svgInput = inputs.svg as ImageParameter;
      if (!svgInput || !svgInput.data) {
        return this.createErrorResult("SVG image input is required.");
      }

      // Check if it's SVG content
      if (svgInput.mimeType !== "image/svg+xml") {
        return this.createErrorResult(
          "Input must be SVG content (image/svg+xml)."
        );
      }

      // Convert Uint8Array to string
      const svg = new TextDecoder().decode(svgInput.data);
      if (!svg) {
        return this.createErrorResult("Failed to decode SVG content.");
      }

      // Validate and parse optional inputs
      const format = ((inputs.format as string) || "png").toLowerCase();
      if (!OUTPUT_FORMATS.includes(format as OutputFormat)) {
        return this.createErrorResult(
          `Format must be one of: ${OUTPUT_FORMATS.join(", ")}.`
        );
      }

      const width = inputs.width as number | undefined;
      const height = inputs.height as number | undefined;
      const scale = (inputs.scale as number) || 1.0;
      const backgroundColor =
        (inputs.backgroundColor as string) || "transparent";

      // Validate numeric inputs
      if (width !== undefined && (width <= 0 || width > 8192)) {
        return this.createErrorResult(
          "Width must be between 1 and 8192 pixels."
        );
      }

      if (height !== undefined && (height <= 0 || height > 8192)) {
        return this.createErrorResult(
          "Height must be between 1 and 8192 pixels."
        );
      }

      if (scale <= 0 || scale > 10) {
        return this.createErrorResult("Scale must be between 0.1 and 10.");
      }

      const options: ResvgRenderOptions = {};

      // Only set a background for a real color; otherwise keep transparency.
      // resvg expects a CSS3 color (e.g. rgba(...)) — the keyword "transparent"
      // is not a valid value, so the alpha channel is preserved by omitting it.
      const background = backgroundColor.trim().toLowerCase();
      if (background && background !== "transparent" && background !== "none") {
        options.background = backgroundColor;
      }

      // Load the fonts the SVG references — resvg has no system fonts here.
      if (svgHasText(svg)) {
        const bucket = context.env.RESSOURCES;
        if (!bucket) {
          return this.createErrorResult(
            "Font rendering requires the resources store, which is not configured."
          );
        }
        const fonts = await loadFonts(bucket, detectFontSlugs(svg));
        options.font = {
          loadSystemFonts: false,
          fontBuffers: fonts.buffers,
          defaultFontFamily: fonts.defaultFontFamily,
          sansSerifFamily: fonts.sansSerifFamily,
          ...(fonts.serifFamily ? { serifFamily: fonts.serifFamily } : {}),
          ...(fonts.monospaceFamily
            ? { monospaceFamily: fonts.monospaceFamily }
            : {}),
        };
      }

      // Add fit-to options based on requested dimensions / scale.
      if (width !== undefined) {
        options.fitTo = { mode: "width", value: width };
      } else if (height !== undefined) {
        options.fitTo = { mode: "height", value: height };
      } else if (scale !== 1.0) {
        options.fitTo = { mode: "zoom", value: scale };
      }

      // Render the SVG to PNG pixels.
      const resvg = new Resvg(svg, options);
      const png = resvg.render().asPng();

      // Encode to the requested format (PNG is already produced by resvg).
      let data: Uint8Array;
      if (format === "png") {
        data = new Uint8Array(png);
      } else {
        const image = PhotonImage.new_from_byteslice(png);
        try {
          data =
            format === "webp"
              ? image.get_bytes_webp()
              : image.get_bytes_jpeg(90);
        } finally {
          image.free();
        }
      }

      const imageParameter: ImageParameter = {
        data,
        mimeType: MIME_BY_FORMAT[format as OutputFormat],
      };

      return this.createSuccessResult({ image: imageParameter });
    } catch (error) {
      return this.createErrorResult(
        `Failed to render SVG: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
