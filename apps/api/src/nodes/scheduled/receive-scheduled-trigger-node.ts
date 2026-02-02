import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class ReceiveScheduledTriggerNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "receive-scheduled-trigger",
    name: "Receive Scheduled Trigger",
    type: "receive-scheduled-trigger",
    description: "Receives scheduled trigger from schedule expression",
    tags: ["Parameter", "Scheduled"],
    icon: "clock",
    documentation:
      "This node extracts timing information from a scheduled workflow, providing access to the scheduled execution time and schedule pattern.",
    inlinable: false,
    asTool: false,
    compatibility: ["scheduled"],
    inputs: [
      {
        name: "scheduleExpression",
        type: "string",
        description: "Schedule expression (e.g., '0 9 * * *' for 9am daily)",
        required: true,
        hidden: true,
        value: "0 0 * * *",
      },
    ],
    outputs: [
      {
        name: "timestamp",
        type: "date",
        description: "Actual execution timestamp (ISO-8601)",
      },
      {
        name: "scheduleExpression",
        type: "string",
        description: "The schedule expression that triggered this execution",
        hidden: true,
      },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      // Get schedule expression from node input (configured by user)
      const scheduleExpression = context.inputs.scheduleExpression as string;

      // If executed via scheduled trigger, use real scheduled context
      // If executed manually, generate mock context for testing
      const scheduledContext = context.scheduledTrigger || {
        timestamp: Date.now(),
        scheduleExpression: scheduleExpression || "manual-execution",
      };

      // Convert timestamp to ISO-8601 string
      const timestamp = new Date(scheduledContext.timestamp).toISOString();

      return this.createSuccessResult({
        timestamp,
        scheduleExpression: scheduledContext.scheduleExpression,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
