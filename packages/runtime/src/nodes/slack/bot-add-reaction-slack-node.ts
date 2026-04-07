import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotAddReactionSlackNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bot-add-reaction-slack",
    name: "Bot Add Reaction (Slack)",
    type: "bot-add-reaction-slack",
    description: "Add an emoji reaction to a Slack message as the bot",
    tags: ["Social", "Slack", "Reaction", "Bot"],
    icon: "smile",
    documentation:
      "This node adds an emoji reaction to a message in a Slack channel using the bot token.",
    usage: 10,
    subscription: true,
    inputs: [
      {
        name: "channelId",
        type: "string",
        description: "Slack channel ID containing the message",
        required: true,
      },
      {
        name: "messageTs",
        type: "string",
        description: "Timestamp of the message to react to",
        required: true,
      },
      {
        name: "emoji",
        type: "string",
        description: "Emoji name without colons (e.g. 'thumbsup')",
        required: true,
      },
    ],
    outputs: [
      {
        name: "ok",
        type: "boolean",
        description: "Whether the reaction was added successfully",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { channelId, messageTs, emoji } = context.inputs;
      const botToken = context.slackBotToken;

      if (!botToken) {
        return this.createErrorResult(
          "Slack bot token is not available. Ensure the workflow is triggered via a configured Slack bot."
        );
      }

      if (!channelId || typeof channelId !== "string") {
        return this.createErrorResult("Channel ID is required");
      }

      if (!messageTs || typeof messageTs !== "string") {
        return this.createErrorResult("Message timestamp is required");
      }

      if (!emoji || typeof emoji !== "string") {
        return this.createErrorResult("Emoji name is required");
      }

      // Strip colons if user included them
      const emojiName = emoji.replace(/^:+|:+$/g, "");

      const response = await fetch("https://slack.com/api/reactions.add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: channelId,
          timestamp: messageTs,
          name: emojiName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to add reaction via Slack API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!data.ok) {
        return this.createErrorResult(
          `Slack API error: ${data.error ?? "unknown error"}`
        );
      }

      return this.createSuccessResult({ ok: true });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error adding reaction via Slack bot"
      );
    }
  }
}
