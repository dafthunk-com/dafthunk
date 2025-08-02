import { Resvg } from "@cf-wasm/resvg";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node renders SVG content to PNG using the Resvg library.
 */
export class ResvgSvgToPngNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "resvg-svg-to-png",
    name: "Resvg SVG to PNG",
    type: "resvg-svg-to-png",
    description:
      "Renders SVG content to PNG format using the high-performance Resvg library.",
    tags: ["Image"],
    icon: "file-image", // Icon suggesting image conversion
    inlinable: true,
    inputs: [
      {
        name: "svg",
        type: "string",
        description: "The SVG content as a string.",
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
      },
      {
        name: "backgroundColor",
        type: "string",
        description: "Background color (e.g., 'white', 'transparent', '#FF0000').",
        required: false,
        value: "transparent",
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
      const svg = inputs.svg as string;
      if (!svg || typeof svg !== "string") {
        return this.createErrorResult("SVG content is required and must be a string.");
      }

      // Validate and parse optional inputs
      const width = inputs.width as number | undefined;
      const height = inputs.height as number | undefined;
      const scale = (inputs.scale as number) || 1.0;
      const backgroundColor = (inputs.backgroundColor as string) || "transparent";

      // Validate numeric inputs
      if (width !== undefined && (width <= 0 || width > 8192)) {
        return this.createErrorResult("Width must be between 1 and 8192 pixels.");
      }

      if (height !== undefined && (height <= 0 || height > 8192)) {
        return this.createErrorResult("Height must be between 1 and 8192 pixels.");
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
      return this.createErrorResult(`Failed to render SVG: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 