import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

/**
 * RandomString node implementation
 * Generates a random string using the specified character set
 */
export class RandomStringNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "random-string",
    name: "Random String",
    type: "random-string",
    description:
      "Generate a random string with a specified length and character set",
    tags: ["Random", "Text", "String"],
    icon: "type",
    documentation:
      "Generates a random string of the specified length using a character set. Supports alphanumeric, alphabetic, numeric, hexadecimal, base64, and custom character sets.",
    inlinable: false,
    asTool: false,
    inputs: [
      {
        name: "length",
        type: "number",
        description: "Length of the string to generate",
        required: true,
        repeated: false,
      },
      {
        name: "charset",
        type: "string",
        description:
          "Character set: 'alphanumeric', 'alpha', 'numeric', 'hex', 'base64', or 'custom'",
        required: false,
        repeated: false,
        value: "alphanumeric",
      },
      {
        name: "customCharset",
        type: "string",
        description: "Custom characters to use when charset is 'custom'",
        required: false,
        repeated: false,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "string",
        description: "Generated random string",
      },
    ],
  };

  private static readonly CHARSETS: Record<string, string> = {
    alphanumeric:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    numeric: "0123456789",
    hex: "0123456789abcdef",
    base64: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        length,
        charset = "alphanumeric",
        customCharset,
      } = context.inputs;

      // Validate length
      if (length === null || length === undefined) {
        return this.createErrorResult("Missing required input: length");
      }

      const lengthNum = Number(length);
      if (isNaN(lengthNum)) {
        return this.createErrorResult(
          `Invalid length: expected number, got ${typeof length}`
        );
      }

      if (lengthNum < 0) {
        return this.createErrorResult(
          `Invalid length: must be non-negative, got ${lengthNum}`
        );
      }

      if (!Number.isInteger(lengthNum)) {
        return this.createErrorResult(
          `Invalid length: must be an integer, got ${lengthNum}`
        );
      }

      // Determine character set
      let characters: string;
      const charsetStr = String(charset);

      if (charsetStr === "custom") {
        if (customCharset === null || customCharset === undefined) {
          return this.createErrorResult(
            "customCharset is required when charset is 'custom'"
          );
        }
        if (typeof customCharset !== "string") {
          return this.createErrorResult("customCharset must be a string");
        }
        if (customCharset.length === 0) {
          return this.createErrorResult("customCharset cannot be empty");
        }
        characters = customCharset;
      } else if (charsetStr in RandomStringNode.CHARSETS) {
        characters = RandomStringNode.CHARSETS[charsetStr];
      } else {
        return this.createErrorResult(
          `Invalid charset: '${charsetStr}'. Must be one of: alphanumeric, alpha, numeric, hex, base64, custom`
        );
      }

      // Generate random string
      let result = "";
      for (let i = 0; i < lengthNum; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
      }

      return this.createSuccessResult({ value: result });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error generating random string: ${error.message}`
      );
    }
  }
}
