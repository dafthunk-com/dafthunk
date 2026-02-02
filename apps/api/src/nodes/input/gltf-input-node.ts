import type { NodeExecution, NodeType } from "@dafthunk/types";

import type { NodeContext } from "../../runtime/node-types";
import { ExecutableNode } from "../../runtime/node-types";

/**
 * GltfInput node implementation
 * This node provides a GLTF input widget that outputs a GLTF reference.
 */
export class GltfInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gltf-input",
    name: "GLTF Input",
    type: "gltf-input",
    description: "A GLTF input widget for uploading 3D models",
    tags: ["Widget", "GLTF", "Input", "3D"],
    icon: "box",
    documentation:
      "This node provides a GLTF input widget for uploading 3D models in GLTF/GLB format.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "gltf",
        description: "Current GLTF value",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "gltf",
        description: "The uploaded GLTF model",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value;

      if (!value) {
        return this.createErrorResult("No GLTF model provided");
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
