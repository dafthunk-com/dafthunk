import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class RegexReplaceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "regex-replace",
    name: "Regex Replace",
    type: "regex-replace",
    description:
      "Replace all matches of a regular expression pattern in a string.",
    tags: ["Text", "Regex", "Replace"],
    icon: "pencil",
    documentation:
      "This node replaces all matches of a regular expression pattern in a string.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "string",
        type: "string",
        description: "The string to search and replace in.",
        required: true,
      },
      {
        name: "pattern",
        type: "string",
        description: "The regex pattern.",
        required: true,
      },
      {
        name: "replacement",
        type: "string",
        description: "The replacement string.",
        required: true,
      },
      {
        name: "flags",
        type: "string",
        description:
          "Regex flags (e.g. 'i', 'g', 'm'). Optional. 'g' is recommended for global replace.",
        required: false,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The resulting string after replacement.",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { string, pattern, replacement, flags } = context.inputs;
      if (typeof string !== "string") {
        return this.createErrorResult("Input 'string' must be a string.");
      }
      if (typeof pattern !== "string") {
        return this.createErrorResult("Input 'pattern' must be a string.");
      }
      if (typeof replacement !== "string") {
        return this.createErrorResult("Input 'replacement' must be a string.");
      }
      let regex: RegExp;
      try {
        regex = new RegExp(
          pattern,
          typeof flags === "string" ? flags : undefined
        );
      } catch (err) {
        return this.createErrorResult(
          `Invalid regex: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      const result = string.replace(regex, replacement);
      return this.createSuccessResult({ result });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
