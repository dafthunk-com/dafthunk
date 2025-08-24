import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class RegexExtractNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "regex-extract",
    name: "Regex Extract",
    type: "regex-extract",
    description:
      "Extract all matches of a regular expression pattern from a string.",
    tags: ["Text"],
    icon: "search",
    documentation: `This node extracts all matches of a regular expression pattern from a string.

## Usage Example

- **Input string**: \`"Hello world, hello universe"\`
- **Input pattern**: \`"hello"\`
- **Input flags**: \`"gi"\`
- **Output**: \`["Hello", "hello"]\``,
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "string",
        type: "string",
        description: "The string to search.",
        required: true,
      },
      {
        name: "pattern",
        type: "string",
        description: "The regex pattern.",
        required: true,
      },
      {
        name: "flags",
        type: "string",
        description:
          "Regex flags (e.g. 'i', 'g', 'm'). Optional. 'g' is recommended for multiple matches.",
        required: false,
      },
    ],
    outputs: [
      {
        name: "matches",
        type: "json",
        description: "Array of matched strings (empty if no match).",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { string, pattern, flags } = context.inputs;
      if (typeof string !== "string") {
        return this.createErrorResult("Input 'string' must be a string.");
      }
      if (typeof pattern !== "string") {
        return this.createErrorResult("Input 'pattern' must be a string.");
      }
      let regex: RegExp;
      try {
        let finalFlags = typeof flags === "string" ? flags : "";
        if (!finalFlags.includes("g")) finalFlags += "g";
        regex = new RegExp(pattern, finalFlags);
      } catch (err) {
        return this.createErrorResult(
          `Invalid regex: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      const matches = Array.from(string.matchAll(regex), (m) => m[0]);
      return this.createSuccessResult({ matches });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
