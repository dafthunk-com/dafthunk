import Bot from "lucide-react/icons/bot";
import Hash from "lucide-react/icons/hash";
import MessageCircle from "lucide-react/icons/message-circle";
import Send from "lucide-react/icons/send";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DiscordBotCreateDialog } from "@/components/workflow/widgets/input/discord-bot-create-dialog";
import { SlackBotCreateDialog } from "@/components/workflow/widgets/input/slack-bot-create-dialog";
import { TelegramBotCreateDialog } from "@/components/workflow/widgets/input/telegram-bot-create-dialog";
import { WhatsAppAccountCreateDialog } from "@/components/workflow/widgets/input/whatsapp-account-create-dialog";

type Step = "choose-type" | "discord" | "telegram" | "whatsapp" | "slack";

interface BotsCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (
    botId: string,
    type: "discord" | "telegram" | "whatsapp" | "slack"
  ) => void;
}

export function BotsCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: BotsCreateDialogProps) {
  const [step, setStep] = useState<Step>("choose-type");

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setStep("choose-type");
    }
    onOpenChange(value);
  };

  if (step === "discord") {
    return (
      <DiscordBotCreateDialog
        isOpen={open}
        onClose={() => handleOpenChange(false)}
        onCreated={(botId) => onCreated(botId, "discord")}
        showCommandStep={false}
      />
    );
  }

  if (step === "telegram") {
    return (
      <TelegramBotCreateDialog
        isOpen={open}
        onClose={() => handleOpenChange(false)}
        onCreated={(botId) => onCreated(botId, "telegram")}
      />
    );
  }

  if (step === "slack") {
    return (
      <SlackBotCreateDialog
        isOpen={open}
        onClose={() => handleOpenChange(false)}
        onCreated={(botId) => onCreated(botId, "slack")}
      />
    );
  }

  if (step === "whatsapp") {
    return (
      <WhatsAppAccountCreateDialog
        isOpen={open}
        onClose={() => handleOpenChange(false)}
        onCreated={(accountId) => onCreated(accountId, "whatsapp")}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bot</DialogTitle>
          <DialogDescription>
            Choose the platform for your bot.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 py-4">
          <button
            type="button"
            onClick={() => setStep("discord")}
            className="flex flex-col items-center gap-3 rounded-lg border p-6 hover:border-primary hover:bg-accent transition-colors"
          >
            <Bot className="h-8 w-8" />
            <span className="font-medium">Discord</span>
          </button>
          <button
            type="button"
            onClick={() => setStep("slack")}
            className="flex flex-col items-center gap-3 rounded-lg border p-6 hover:border-primary hover:bg-accent transition-colors"
          >
            <Hash className="h-8 w-8" />
            <span className="font-medium">Slack</span>
          </button>
          <button
            type="button"
            onClick={() => setStep("telegram")}
            className="flex flex-col items-center gap-3 rounded-lg border p-6 hover:border-primary hover:bg-accent transition-colors"
          >
            <Send className="h-8 w-8" />
            <span className="font-medium">Telegram</span>
          </button>
          <button
            type="button"
            onClick={() => setStep("whatsapp")}
            className="flex flex-col items-center gap-3 rounded-lg border p-6 hover:border-primary hover:bg-accent transition-colors"
          >
            <MessageCircle className="h-8 w-8" />
            <span className="font-medium">WhatsApp</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
