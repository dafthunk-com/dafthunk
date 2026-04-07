import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotReceiveSlackMessageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "receive-slack-message",
    name: "Bot Receive Message (Slack)",
    type: "receive-slack-message",
    description: "Receive an incoming message from a Slack channel via the bot",
    tags: ["Social", "Slack", "Message", "Receive"],
    icon: "message-square",
    documentation:
      "This node receives incoming Slack messages, providing access to channel ID, message content, thread info, and user details.",
    trigger: true,
    inlinable: true,
    usage: 0,
    subscription: true,
    inputs: [
      {
        name: "slackBotId",
        type: "slack",
        description: "The Slack bot to use for this trigger",
        hidden: true,
        required: false,
      },
      {
        name: "channelId",
        type: "string",
        description: "The Slack channel ID to listen on (optional)",
        hidden: true,
        required: false,
      },
    ],
    outputs: [
      {
        name: "slackBotId",
        type: "string",
        description: "The Slack bot ID used for this trigger",
      },
      {
        name: "channelId",
        type: "string",
        description: "Slack channel ID",
      },
      {
        name: "threadTs",
        type: "string",
        description: "Thread timestamp (for threaded messages)",
      },
      {
        name: "messageTs",
        type: "string",
        description: "Message timestamp (unique message ID)",
      },
      {
        name: "content",
        type: "string",
        description: "Message text content",
      },
      {
        name: "userId",
        type: "string",
        description: "Message author's user ID",
      },
      {
        name: "timestamp",
        type: "string",
        description: "Message timestamp",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.slackMessage) {
        throw new Error(
          "Slack message information is required but not provided in the context."
        );
      }

      const {
        slackBotId,
        channelId,
        threadTs,
        messageTs,
        content,
        userId,
        timestamp,
      } = context.slackMessage;

      return this.createSuccessResult({
        slackBotId: slackBotId ?? "",
        channelId,
        threadTs: threadTs ?? "",
        messageTs,
        content,
        userId,
        timestamp,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
