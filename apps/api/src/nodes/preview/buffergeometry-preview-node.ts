import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * BufferGeometryPreview node implementation
 * This node displays 3D geometry data and persists the reference for read-only execution views
 * The geometry is passed through without modification - no double-save occurs
 */
export class BufferGeometryPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-buffergeometry",
    name: "Buffer Geometry Preview",
    type: "preview-buffergeometry",
    description: "Display and preview 3D buffer geometry data",
    tags: ["Widget", "Preview", "3D", "Geometry"],
    icon: "box",
    documentation:
      "This node displays 3D buffer geometry data in the workflow. The geometry reference is persisted for viewing in read-only execution and deployed workflow views. No data is duplicated - the geometry passes through unchanged.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "buffergeometry",
        description: "Buffer geometry to display",
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
