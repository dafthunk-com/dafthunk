import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * GeoJSONInput node implementation
 * This node provides a GeoJSON input widget that outputs GeoJSON data.
 */
export class GeoJSONInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geojson-input",
    name: "GeoJSON Input",
    type: "geojson-input",
    description: "A GeoJSON input widget for editing geographic data",
    tags: ["Widget", "GeoJSON", "Input", "Geo"],
    icon: "map",
    documentation:
      "This node provides a GeoJSON input widget for editing geographic data.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "geojson",
        description: "Current GeoJSON value",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "geojson",
        description: "The GeoJSON data",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value;

      if (value === undefined || value === null) {
        return this.createErrorResult("No GeoJSON data provided");
      }

      return this.createSuccessResult({
        value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
