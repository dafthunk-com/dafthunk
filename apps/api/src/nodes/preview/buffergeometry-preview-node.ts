import { NodeExecution, NodeType } from "@dafthunk/types";

import { BufferGeometryParameter, ExecutableNode } from "../types";
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
    outputs: [
      {
        name: "displayValue",
        type: "buffergeometry",
        description: "Persisted geometry reference for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as BufferGeometryParameter | undefined;

      // Validate if provided
      if (value !== undefined) {
        if (
          typeof value !== "object" ||
          !(value.data instanceof Uint8Array) ||
          typeof value.mimeType !== "string"
        ) {
          return this.createErrorResult(
            "Value must be a valid buffer geometry with data and mimeType"
          );
        }
      }

      // Store geometry reference in output for persistence - no transformation
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
