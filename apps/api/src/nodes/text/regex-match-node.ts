import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class RegexMatchNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "regex-match",
    name: "Regex Match",
    type: "regex-match",
    description: "Test if a string matches a regular expression pattern.",
    category: "Text",
    icon: "search",
    inputs: [
      {
        name: "string",
        type: "string",
        description: "The string to test.",
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
        description: "Regex flags (e.g. 'i', 'g', 'm'). Optional.",
        required: false,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "boolean",
        description: "True if the string matches the pattern, false otherwise.",
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
        regex = new RegExp(
          pattern,
          typeof flags === "string" ? flags : undefined
        );
      } catch (err) {
        return this.createErrorResult(
          `Invalid regex: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      const result = regex.test(string);
      return this.createSuccessResult({ result });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
