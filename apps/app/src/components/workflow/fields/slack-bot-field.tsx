import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSlackBots } from "@/services/bot-service";
import { cn } from "@/utils/utils";

import { SlackBotCreateDialog } from "../widgets/input/slack-bot-create-dialog";
import type { FieldProps } from "./types";

const CREATE_NEW = "__create_new__";

export function SlackBotField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { slackBots, isSlackBotsLoading, mutateSlackBots } = useSlackBots();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const stringValue = String(value ?? "");

  if (disabled) {
    const label = slackBots?.find((b) => b.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No Slack bot"}
            >
              {connected ? "Connected" : label || "No Slack bot"}
            </SelectValue>
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
        disabled={isSlackBotsLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isSlackBotsLoading
                  ? "Loading..."
                  : slackBots?.length === 0
                    ? "No Slack bots"
                    : "Select Slack bot"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {slackBots?.map((bot) => (
            <SelectItem key={bot.id} value={bot.id} className="text-xs">
              {bot.name}
            </SelectItem>
          ))}
          {(slackBots?.length ?? 0) > 0 && <SelectSeparator />}
          <SelectItem value={CREATE_NEW} className="text-xs">
            + New Bot
          </SelectItem>
        </SelectContent>
      </Select>
      <SlackBotCreateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(botId) => {
          mutateSlackBots();
          onChange(botId);
        }}
      />
    </div>
  );
}
