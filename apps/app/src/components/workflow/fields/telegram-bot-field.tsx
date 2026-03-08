import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTelegramBots } from "@/services/telegram-bot-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

export function TelegramBotField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { telegramBots, isTelegramBotsLoading } = useTelegramBots();

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

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={(val) => onChange(val || undefined)}
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
        </SelectContent>
      </Select>
    </div>
  );
}
