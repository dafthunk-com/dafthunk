import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDiscordBots } from "@/services/discord-bot-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

export function DiscordBotField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { discordBots, isDiscordBotsLoading } = useDiscordBots();

  const stringValue = String(value ?? "");

  if (disabled) {
    const label = discordBots?.find((b) => b.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No Discord bot"}
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
        disabled={isDiscordBotsLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isDiscordBotsLoading
                  ? "Loading..."
                  : discordBots?.length === 0
                    ? "No Discord bots"
                    : "Select Discord bot"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {discordBots?.map((bot) => (
            <SelectItem key={bot.id} value={bot.id} className="text-xs">
              {bot.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
