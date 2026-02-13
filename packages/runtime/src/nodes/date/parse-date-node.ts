import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class ParseDateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "date-parse",
    name: "Parse Date",
    type: "date-parse",
    description: "Parse input into a date (ISO-8601)",
    documentation:
      "Parses a value into an ISO-8601 timestamp. ### Inputs value (any): ISO string, epoch milliseconds, or Date-like string ### Outputs date (date): ISO string or undefined if invalid",
    tags: ["Time", "Date", "Parse"],
    icon: "calendar",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "value",
        type: "any",
        description:
          "Value to parse. Accepts ISO string, epoch ms number, or Date string",
        required: true,
      },
    ],
    outputs: [
      {
        name: "date",
        type: "date",
        description: "Parsed date in ISO-8601, or undefined if invalid",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as unknown;
      let iso: string | undefined;
      if (value instanceof Date) iso = value.toISOString();
      else if (typeof value === "number") {
        const d = new Date(value);
        iso = isNaN(d.getTime()) ? undefined : d.toISOString();
      } else if (typeof value === "string") {
        const d = new Date(value);
        iso = isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      return this.createSuccessResult({ date: iso });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
