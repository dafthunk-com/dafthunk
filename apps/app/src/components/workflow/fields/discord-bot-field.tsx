import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDiscordBots } from "@/services/discord-bot-service";
import { cn } from "@/utils/utils";

import { DiscordBotCreateDialog } from "../widgets/input/discord-bot-create-dialog";
import type { FieldProps } from "./types";

const CREATE_NEW = "__create_new__";

export function DiscordBotField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { discordBots, isDiscordBotsLoading, mutateDiscordBots } =
    useDiscordBots();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
          {(discordBots?.length ?? 0) > 0 && <SelectSeparator />}
          <SelectItem value={CREATE_NEW} className="text-xs">
            + New Bot
          </SelectItem>
        </SelectContent>
      </Select>
      <DiscordBotCreateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(botId) => {
          mutateDiscordBots();
          onChange(botId);
        }}
      />
    </div>
  );
}
