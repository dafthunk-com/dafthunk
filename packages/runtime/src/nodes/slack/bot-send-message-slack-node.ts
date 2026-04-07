import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotSendMessageSlackNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bot-send-message-slack",
    name: "Bot Send Message (Slack)",
    type: "bot-send-message-slack",
    description: "Send a message to a Slack channel as the bot",
    tags: ["Social", "Slack", "Message", "Send"],
    icon: "message-circle",
    documentation:
      "This node sends messages to Slack channels using the bot token. Optionally specify a thread_ts to reply in a thread.",
    usage: 10,
    subscription: true,
    inputs: [
      {
        name: "channelId",
        type: "string",
        description: "Slack channel ID to send the message to",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Message text",
        required: true,
      },
      {
        name: "threadTs",
        type: "string",
        description: "Thread timestamp to reply in a thread (optional)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "channelId",
        type: "string",
        description: "Channel ID where the message was sent",
        hidden: true,
      },
      {
        name: "messageTs",
        type: "string",
        description: "Timestamp of the sent message (unique ID)",
        hidden: true,
      },
      {
        name: "timestamp",
        type: "string",
        description: "Unix timestamp of when the message was sent",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { channelId, text, threadTs } = context.inputs;
      const botToken = context.slackBotToken;

      if (!botToken) {
        return this.createErrorResult(
          "Slack bot token is not available. Ensure the workflow is triggered via a configured Slack bot."
        );
      }

      if (!channelId || typeof channelId !== "string") {
        return this.createErrorResult("Channel ID is required");
      }

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Message text is required");
      }

      const payload: Record<string, string> = {
        channel: channelId,
        text,
      };

      if (threadTs && typeof threadTs === "string") {
        payload.thread_ts = threadTs;
      }

      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send message via Slack API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        channel?: string;
        ts?: string;
      };

      if (!data.ok) {
        return this.createErrorResult(
          `Slack API error: ${data.error ?? "unknown error"}`
        );
      }

      return this.createSuccessResult({
        channelId: data.channel ?? channelId,
        messageTs: data.ts ?? "",
        timestamp: data.ts ?? "",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sending message via Slack bot"
      );
    }
  }
}
