import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  imageFilename,
  imageSizeError,
  readOptionalImage,
} from "../../utils/images";

/** The Telegram Bot API caps uploaded photos at 10 MB. */
const TELEGRAM_MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export class BotSendPhotoTelegramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-photo-telegram",
    name: "Bot Send Photo (Telegram)",
    type: "send-photo-telegram",
    description: "Send a photo to a Telegram chat as the bot",
    tags: ["Social", "Telegram", "Image", "Send"],
    icon: "image",
    documentation:
      "This node sends photos to Telegram chats using the Telegram Bot API. To send a photo from the web, load it with an Image URL Loader node first.",
    usage: 10,
    inlinable: false,
    asTool: false,
    inputs: [
      {
        name: "chatId",
        type: "string",
        description: "Telegram chat ID to send the photo to",
        required: true,
      },
      {
        name: "photo",
        type: "image",
        description: "Photo to send",
        required: true,
      },
      {
        name: "caption",
        type: "string",
        description: "Photo caption (up to 1024 characters)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "messageId",
        type: "string",
        description: "Sent message ID",
        hidden: true,
      },
      {
        name: "chatId",
        type: "string",
        description: "Chat ID where the photo was sent",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { chatId, caption } = context.inputs;
      const botToken = context.telegramBotToken;

      if (!botToken) {
        return this.createErrorResult(
          "Telegram bot token is not available. Ensure the workflow is triggered via a configured Telegram bot."
        );
      }

      if (!chatId || typeof chatId !== "string") {
        return this.createErrorResult("Chat ID is required");
      }

      const { image: photo, error: photoError } = readOptionalImage(
        context.inputs.photo
      );
      if (photoError) {
        return this.createErrorResult(photoError);
      }
      if (!photo) {
        return this.createErrorResult("Photo is required");
      }

      const sizeError = imageSizeError(
        photo,
        TELEGRAM_MAX_PHOTO_BYTES,
        "Telegram"
      );
      if (sizeError) {
        return this.createErrorResult(sizeError);
      }

      const form = new FormData();
      form.append("chat_id", chatId);
      form.append(
        "photo",
        new Blob([photo.data], { type: photo.mimeType }),
        imageFilename(photo)
      );

      if (caption && typeof caption === "string") {
        if (caption.length > 1024) {
          return this.createErrorResult(
            "Caption must be 1024 characters or less"
          );
        }
        form.append("caption", caption);
      }

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendPhoto`,
        {
          method: "POST",
          body: form,
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send photo via Telegram API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        result: {
          message_id: number;
          chat: { id: number };
        };
      };

      return this.createSuccessResult({
        messageId: String(data.result.message_id),
        chatId: String(data.result.chat.id),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sending photo via Telegram"
      );
    }
  }
}
