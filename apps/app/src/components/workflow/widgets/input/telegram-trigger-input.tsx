import { useState } from "react";

import { Input } from "@/components/ui/input";
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
import { updateNodeInput, useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue, useDebouncedChange } from "../widget";
import { TelegramBotCreateDialog } from "./telegram-bot-create-dialog";

const CREATE_NEW_SENTINEL = "__create_new__";

interface TelegramTriggerInputProps extends BaseWidgetProps {
  nodeId: string;
  telegramBotId: string;
  chatId: string;
  inputs: WorkflowParameter[];
}

function TelegramTriggerInputWidget({
  nodeId,
  telegramBotId,
  chatId,
  inputs,
  className,
  disabled = false,
}: TelegramTriggerInputProps) {
  const { telegramBots, isTelegramBotsLoading, mutateTelegramBots } =
    useTelegramBots();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const [localChatId, setLocalChatId] = useState(chatId ?? "");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { debouncedOnChange } = useDebouncedChange((value) => {
    updateNodeInput(
      nodeId,
      "chatId",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  }, 300);

  const handleBotChange = (value: string) => {
    if (value === CREATE_NEW_SENTINEL) {
      setIsCreateDialogOpen(true);
      return;
    }
    updateNodeInput(
      nodeId,
      "telegramBotId",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleBotCreated = async (botId: string) => {
    await mutateTelegramBots?.();
    updateNodeInput(
      nodeId,
      "telegramBotId",
      botId,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
    setIsCreateDialogOpen(false);
  };

  const handleChatIdChange = (value: string) => {
    setLocalChatId(value);
    debouncedOnChange(value);
  };

  return (
    <div className={cn("p-2 space-y-1", className)}>
      <Select
        value={telegramBotId || ""}
        onValueChange={handleBotChange}
        disabled={disabled || isTelegramBotsLoading}
      >
        <SelectTrigger className="h-6 text-xs">
          <SelectValue
            placeholder={isTelegramBotsLoading ? "Loading..." : "Select a bot"}
          />
        </SelectTrigger>
        <SelectContent>
          {telegramBots.map((bot) => (
            <SelectItem key={bot.id} value={bot.id}>
              {bot.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW_SENTINEL}>+ New Bot</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={localChatId}
        onChange={(e) => handleChatIdChange(e.target.value)}
        placeholder="Chat ID (optional)"
        disabled={disabled}
        className="h-6 text-xs px-1.5 font-mono"
      />
      <TelegramBotCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleBotCreated}
      />
    </div>
  );
}

export const telegramTriggerInputWidget = createWidget({
  component: TelegramTriggerInputWidget,
  nodeTypes: ["receive-telegram-message"],
  inputField: "telegramBotId",
  managedFields: ["chatId"],
  extractConfig: (nodeId, inputs) => ({
    nodeId,
    telegramBotId: getInputValue(inputs, "telegramBotId", ""),
    chatId: getInputValue(inputs, "chatId", ""),
    inputs,
  }),
});
