import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, GltfParameter } from "../types";
import { NodeContext } from "../types";

/**
 * GltfOutput node implementation
 * This node displays glTF 3D model data and persists the reference for read-only execution views
 * The model is passed through without modification - no double-save occurs
 */
export class GltfOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-gltf",
    name: "glTF Output",
    type: "output-gltf",
    description: "Display and preview glTF 3D model data",
    tags: ["Widget", "Output", "3D", "glTF"],
    icon: "box",
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
    outputs: [
      {
        name: "displayValue",
        type: "gltf",
        description: "Persisted model reference for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as GltfParameter | undefined;

      // Validate if provided
      if (value !== undefined) {
        if (
          typeof value !== "object" ||
          !(value.data instanceof Uint8Array) ||
          typeof value.mimeType !== "string"
        ) {
          return this.createErrorResult(
            "Value must be a valid glTF model with data and mimeType"
          );
        }

        // Validate MIME type is glTF-related
        if (
          !value.mimeType.includes("gltf") &&
          !value.mimeType.includes("model")
        ) {
          return this.createErrorResult(
            "MIME type must be glTF-related (e.g., model/gltf+json, model/gltf-binary)"
          );
        }
      }

      // Store model reference in output for persistence - no transformation
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
