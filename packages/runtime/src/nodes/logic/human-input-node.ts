import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Human Input Node
 *
 * Pauses workflow execution and waits for human input before continuing.
 * Supports three input modes: free-text response, approve/reject gate, or structured JSON.
 * Only works in async mode (WorkflowRuntime with durable execution).
 */
export class HumanInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "human-input",
    name: "Human Input",
    type: "human-input",
    description:
      "Pauses workflow execution and waits for human input before continuing. Use for approval gates, manual review steps, or collecting user responses.",
    tags: ["Logic", "HITL", "Approval"],
    icon: "user-check",
    documentation:
      "This node pauses the workflow and waits for a human to provide input. It supports three modes: 'text' for free-form responses, 'approve' for approval/rejection gates, and 'json' for structured data. The workflow resumes once the human responds or the timeout expires. Only works with durable workflow execution.",
    usage: 0,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "The question or instruction shown to the user.",
        required: true,
      },
      {
        name: "context",
        type: "string",
        description:
          "Additional context from upstream nodes to display alongside the prompt.",
        required: false,
      },
      {
        name: "input_type",
        type: "string",
        description:
          "Controls the input widget: 'text' for free-form, 'approve' for approve/reject, 'json' for structured data.",
        required: false,
        hidden: true,
        value: "text",
      },
      {
        name: "timeout",
        type: "string",
        description: "How long to wait for a response before timing out.",
        required: false,
        hidden: true,
        value: "24 hours",
      },
      {
        name: "notify_email",
        type: "string",
        description:
          "Email address to notify when this node is waiting for input.",
        required: false,
        hidden: true,
      },
      {
        name: "notify_webhook",
        type: "string",
        description:
          "Webhook URL to POST to when this node is waiting for input.",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "The human's text response.",
      },
      {
        name: "approved",
        type: "boolean",
        description:
          "Whether the human approved (true) or rejected (false). Only set in 'approve' mode.",
      },
      {
        name: "metadata",
        type: "json",
        description: "Optional structured metadata from the response.",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    if (!context.asyncSupported || !context.executionId) {
      return this.createErrorResult(
        "Human Input requires durable workflow execution (async mode)."
      );
    }

    const timeout = (context.inputs.timeout as string) || "24 hours";

    return {
      nodeId: this.node.id,
      status: "pending",
      usage: 0,
      pendingEvent: {
        type: `human-input-${context.nodeId}`,
        timeout,
      },
    } as NodeExecution;
  }
}
