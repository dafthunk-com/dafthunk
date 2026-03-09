import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTelegramBots } from "@/services/telegram-bot-service";
import { cn } from "@/utils/utils";

import { TelegramBotCreateDialog } from "../widgets/input/telegram-bot-create-dialog";
import type { FieldProps } from "./types";

const CREATE_NEW = "__create_new__";

export function TelegramBotField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { telegramBots, isTelegramBotsLoading, mutateTelegramBots } =
    useTelegramBots();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const stringValue = String(value ?? "");

  if (disabled) {
    const bot = telegramBots?.find((b) => b.id === stringValue);
    const label = bot
      ? `${bot.name}${bot.botUsername ? ` (@${bot.botUsername})` : ""}`
      : "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No Telegram bot"}
            />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  const handleValueChange = (val: string) => {
    if (val === CREATE_NEW) {
      setIsCreateOpen(true);
      return;
    }
    onChange(val || undefined);
  };

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={handleValueChange}
        disabled={isTelegramBotsLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isTelegramBotsLoading
                  ? "Loading..."
                  : telegramBots?.length === 0
                    ? "No Telegram bots"
                    : "Select Telegram bot"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {telegramBots?.map((bot) => (
            <SelectItem key={bot.id} value={bot.id} className="text-xs">
              {bot.name}
              {bot.botUsername ? ` (@${bot.botUsername})` : ""}
            </SelectItem>
          ))}
          {(telegramBots?.length ?? 0) > 0 && <SelectSeparator />}
          <SelectItem value={CREATE_NEW} className="text-xs">
            + New Bot
          </SelectItem>
        </SelectContent>
      </Select>
      <TelegramBotCreateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(botId) => {
          mutateTelegramBots();
          onChange(botId);
        }}
      />
    </div>
  );
}
