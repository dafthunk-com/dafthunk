import Bot from "lucide-react/icons/bot";
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
import { TelegramBotCreateDialog } from "@/components/workflow/widgets/input/telegram-bot-create-dialog";

type Step = "choose-type" | "discord" | "telegram";

interface BotsCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (botId: string, type: "discord" | "telegram") => void;
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bot</DialogTitle>
          <DialogDescription>
            Choose the platform for your bot.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
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
            onClick={() => setStep("telegram")}
            className="flex flex-col items-center gap-3 rounded-lg border p-6 hover:border-primary hover:bg-accent transition-colors"
          >
            <Send className="h-8 w-8" />
            <span className="font-medium">Telegram</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
