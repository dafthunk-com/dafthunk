import { NodeExecution, NodeType } from "@dafthunk/types";
import { v1 as uuidv1, v4 as uuidv4, v7 as uuidv7 } from "uuid";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * RandomUUID node implementation
 * Generates a random UUID using the specified version (v1, v4, or v7)
 */
export class RandomUuidNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "random-uuid",
    name: "Random UUID",
    type: "random-uuid",
    description: "Generate a random UUID (Universally Unique Identifier)",
    tags: ["Random", "Data", "UUID"],
    icon: "fingerprint",
    documentation:
      "Generates a UUID using the specified version. Version 4 (default) is random, version 1 is timestamp-based, and version 7 is timestamp-ordered random.",
    inlinable: false,
    asTool: false,
    inputs: [
      {
        name: "version",
        type: "number",
        description: "UUID version (1, 4, or 7)",
        required: false,
        repeated: false,
        value: 4,
      },
    ],
    outputs: [
      {
        name: "uuid",
        type: "string",
        description: "Generated UUID",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { version = 4 } = context.inputs;

      // Validate version
      const versionNum = Number(version);
      if (isNaN(versionNum)) {
        return this.createErrorResult(
          `Invalid version: expected number, got ${typeof version}`
        );
      }

      if (![1, 4, 7].includes(versionNum)) {
        return this.createErrorResult(
          `Invalid UUID version: ${versionNum}. Must be 1, 4, or 7`
        );
      }

      // Generate UUID based on version
      let uuid: string;
      switch (versionNum) {
        case 1:
          uuid = uuidv1();
          break;
        case 4:
          uuid = uuidv4();
          break;
        case 7:
          uuid = uuidv7();
          break;
        default:
          return this.createErrorResult(
            `Unsupported UUID version: ${versionNum}`
          );
      }

      return this.createSuccessResult({ uuid });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error generating UUID: ${error.message}`);
    }
  }
}
