import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * GltfPreview node implementation
 * This node displays glTF 3D model data and persists the reference for read-only execution views
 * The model is passed through without modification - no double-save occurs
 */
export class GltfPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-gltf",
    name: "glTF Preview",
    type: "preview-gltf",
    description: "Display and preview glTF 3D model data",
    tags: ["Widget", "Preview", "3D", "glTF"],
    icon: "cube",
    documentation:
      "This node displays glTF 3D model data in the workflow. The model reference is persisted for viewing in read-only execution and deployed workflow views. No data is duplicated - the model passes through unchanged.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "gltf",
        description: "glTF model to display",
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
