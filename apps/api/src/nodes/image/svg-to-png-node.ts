import { Resvg } from "@cf-wasm/resvg";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node renders SVG content to PNG using the Resvg library.
 */
export class SvgToPngNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "svg-to-png",
    name: "SVG to PNG",
    type: "svg-to-png",
    description: "Renders SVG content to PNG format using the Resvg library.",
    tags: ["Image", "SVG", "Convert", "PNG"],
    icon: "file-image",
    documentation:
      "This node renders SVG content to PNG format using the Resvg library.",
    inlinable: true,
    inputs: [
      {
        name: "svg",
        type: "image",
        description: "The SVG image to render.",
        required: true,
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
          "Background color (e.g., 'white', 'transparent', '#FF0000').",
        required: false,
        value: "transparent",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The rendered PNG image.",
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

      // Prepare Resvg options
      const options: any = {
        background: backgroundColor,
      };

      // Add fit-to options if width or height is specified
      if (width !== undefined && height !== undefined) {
        options.fitTo = {
          mode: "width", // You could also use 'height' or other modes
          value: width,
        };
      } else if (width !== undefined) {
        options.fitTo = {
          mode: "width",
          value: width,
        };
      } else if (height !== undefined) {
        options.fitTo = {
          mode: "height",
          value: height,
        };
      }

      // Apply scale if specified and no explicit dimensions
      if (scale !== 1.0 && width === undefined && height === undefined) {
        options.fitTo = {
          mode: "zoom",
          value: scale,
        };
      }

      // Create Resvg instance and render
      const resvg = new Resvg(svg, options);
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      // Convert to ImageParameter format
      const imageParameter: ImageParameter = {
        data: new Uint8Array(pngBuffer),
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: imageParameter });
    } catch (error) {
      return this.createErrorResult(
        `Failed to render SVG: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
