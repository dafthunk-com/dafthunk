import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

export class NowDateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "date-now",
    name: "Now",
    type: "date-now",
    description: "Get the current date and time as ISO-8601 string",
    documentation:
      "Returns the current timestamp in ISO-8601 format (UTC). ### Outputs date (date): ISO timestamp, e.g. 2024-01-01T12:34:56.789Z",
    tags: ["Time", "Date", "Now"],
    icon: "calendar",
    inlinable: true,
    asTool: true,
    inputs: [],
    outputs: [
      {
        name: "date",
        type: "date",
        description: "Current date-time in ISO-8601",
      },
    ],
  };

  async execute(_context: NodeContext): Promise<NodeExecution> {
    try {
      const iso = new Date().toISOString();
      return this.createSuccessResult({ date: iso });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
