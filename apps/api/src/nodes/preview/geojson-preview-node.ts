import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * GeoJSONPreview node implementation
 * This node displays GeoJSON geographic data and persists the value for read-only execution views
 */
export class GeoJSONPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-geojson",
    name: "GeoJSON Preview",
    type: "preview-geojson",
    description: "Display and preview GeoJSON geographic data",
    tags: ["Widget", "Preview", "GeoJSON", "Geo"],
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
    outputs: [],
  };

  async execute(_context: NodeContext): Promise<NodeExecution> {
    try {
      return this.createSuccessResult({});
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
