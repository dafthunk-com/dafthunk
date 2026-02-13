import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { GeoJSON, NodeExecution, NodeType } from "@dafthunk/types";

/**
 * GeoJSONOutput node implementation
 * This node displays GeoJSON geographic data and persists the value for read-only execution views
 */
export class GeoJSONOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-geojson",
    name: "GeoJSON Output",
    type: "output-geojson",
    description: "Display and preview GeoJSON geographic data",
    tags: ["Widget", "Output", "GeoJSON", "Geo"],
    icon: "map-pin",
    documentation:
      "This node displays GeoJSON geographic data in the workflow. The value is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "geojson",
        description: "GeoJSON data to display",
        required: true,
      },
    ],
    outputs: [
      {
        name: "displayValue",
        type: "geojson",
        description: "Persisted GeoJSON value for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as GeoJSON | undefined;

      // Validate GeoJSON structure if provided
      if (value !== undefined) {
        if (typeof value !== "object" || value === null) {
          return this.createErrorResult("Value must be a valid GeoJSON object");
        }

        // Basic GeoJSON structure validation
        if (
          !("type" in value) ||
          !["Geometry", "Feature", "FeatureCollection"].includes(value.type)
        ) {
          return this.createErrorResult(
            "Value must be a valid GeoJSON with type: Geometry, Feature, or FeatureCollection"
          );
        }
      }

      // Store value in output for persistence across executions
      return this.createSuccessResult({
        displayValue: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
