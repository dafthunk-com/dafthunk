import { NodeExecution, NodeType } from "@dafthunk/types";
import { type GeoJSONSvgOptions, geojsonToSvg } from "@dafthunk/utils";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class GeoJsonToSvgNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geojson-to-svg",
    name: "GeoJSON to SVG",
    type: "geojson-to-svg",
    description:
      "Renders GeoJSON data into an SVG file using d3-geo with identity projection. Creates separate path elements for each geometry with appropriate styling.",
    tags: ["Geo", "Image"],
    icon: "map",
    documentation: "*Missing detailed documentation*",
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "GeoJSON data to render",
        required: true,
      },
      {
        name: "width",
        type: "number",
        description: "SVG width in pixels",
        required: false,
        value: 400,
      },
      {
        name: "height",
        type: "number",
        description: "SVG height in pixels",
        required: false,
        value: 300,
      },
      {
        name: "strokeColor",
        type: "string",
        description: "Stroke color for features",
        required: false,
        value: "#3b82f6",
        hidden: true,
      },
      {
        name: "strokeWidth",
        type: "number",
        description: "Stroke width in pixels",
        required: false,
        value: 2,
        hidden: true,
      },
      {
        name: "fillColor",
        type: "string",
        description: "Fill color for features",
        required: false,
        value: "rgba(59, 130, 246, 0.2)",
        hidden: true,
      },
      {
        name: "backgroundColor",
        type: "string",
        description: "Background color of the SVG",
        required: false,
        value: "#f8fafc",
        hidden: true,
      },
      {
        name: "minX",
        type: "number",
        description:
          "Minimum X coordinate (left boundary) of the viewport. If not provided, auto-fits to GeoJSON extent.",
        required: false,
        hidden: true,
      },
      {
        name: "minY",
        type: "number",
        description:
          "Minimum Y coordinate (bottom boundary) of the viewport. If not provided, auto-fits to GeoJSON extent.",
        required: false,
        hidden: true,
      },
      {
        name: "maxX",
        type: "number",
        description:
          "Maximum X coordinate (right boundary) of the viewport. If not provided, auto-fits to GeoJSON extent.",
        required: false,
        hidden: true,
      },
      {
        name: "maxY",
        type: "number",
        description:
          "Maximum Y coordinate (top boundary) of the viewport. If not provided, auto-fits to GeoJSON extent.",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "svg",
        type: "image",
        description: "SVG image rendered from GeoJSON",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        geojson,
        width = 400,
        height = 300,
        strokeColor = "#3b82f6",
        strokeWidth = 2,
        fillColor = "rgba(59, 130, 246, 0.2)",
        backgroundColor = "#f8fafc",
        minX,
        minY,
        maxX,
        maxY,
      } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("No GeoJSON data provided");
      }

      // Prepare options for the helper function
      const options: GeoJSONSvgOptions = {
        width,
        height,
        strokeColor,
        strokeWidth,
        fillColor,
        backgroundColor,
        minX,
        minY,
        maxX,
        maxY,
      };

      // Use the helper function to generate SVG
      const result = geojsonToSvg(geojson, options);

      if (result.error) {
        return this.createErrorResult(result.error);
      }

      if (result.paths.length === 0) {
        return this.createErrorResult(
          "Failed to generate SVG paths from GeoJSON"
        );
      }

      // Convert SVG string to Uint8Array
      const svgBytes = new TextEncoder().encode(result.svg);

      return this.createSuccessResult({
        svg: {
          data: svgBytes,
          mimeType: "image/svg+xml",
        },
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error rendering GeoJSON to SVG: ${error.message}`
      );
    }
  }
}
