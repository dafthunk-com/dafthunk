import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class ReceiveScheduledTriggerNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "receive-scheduled-trigger",
    name: "Receive Scheduled Trigger",
    type: "receive-scheduled-trigger",
    description: "Receives scheduled trigger from schedule expression",
    tags: ["Parameter", "Schedule", "Scheduled"],
    icon: "clock",
    documentation:
      "This node extracts timing information from a scheduled workflow, providing access to the scheduled execution time and schedule pattern.",
    inlinable: true,
    asTool: true,
    compatibility: ["scheduled"],
    inputs: [
      {
        name: "scheduleExpression",
        type: "string",
        description: "Schedule expression (e.g., '0 9 * * *' for 9am daily)",
        required: true,
        hidden: false,
      },
    ],
    outputs: [
      {
        name: "timestamp",
        type: "number",
        description: "Actual execution timestamp",
      },
      {
        name: "scheduledTime",
        type: "number",
        description: "Expected execution time from schedule expression",
      },
      {
        name: "scheduleExpression",
        type: "string",
        description: "The schedule expression that triggered this execution",
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
        scheduledTime: Date.now(),
        scheduleExpression: scheduleExpression || "manual-execution",
      };

      return this.createSuccessResult({
        timestamp: scheduledContext.timestamp,
        scheduledTime: scheduledContext.scheduledTime,
        scheduleExpression: scheduledContext.scheduleExpression,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
