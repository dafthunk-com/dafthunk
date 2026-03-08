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
import { useDiscordBots } from "@/services/discord-bot-service";
import { cn } from "@/utils/utils";

import { useWorkflow } from "../../workflow-context";
import { updateNodeInput } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue, useDebouncedChange } from "../widget";
import { DiscordBotCreateDialog } from "./discord-bot-create-dialog";

const CREATE_NEW_SENTINEL = "__create_new__";

interface DiscordTriggerInputProps extends BaseWidgetProps {
  nodeId: string;
  discordBotId: string;
  commandName: string;
  inputs: WorkflowParameter[];
}

function DiscordTriggerInputWidget({
  nodeId,
  discordBotId,
  commandName,
  inputs,
  className,
  disabled = false,
}: DiscordTriggerInputProps) {
  const { discordBots, isDiscordBotsLoading, mutateDiscordBots } =
    useDiscordBots();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const [localCommand, setLocalCommand] = useState(commandName ?? "");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { debouncedOnChange } = useDebouncedChange((value) => {
    updateNodeInput(
      nodeId,
      "commandName",
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
      "discordBotId",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleBotCreated = async (botId: string) => {
    await mutateDiscordBots?.();
    updateNodeInput(
      nodeId,
      "discordBotId",
      botId,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleCommandNameSet = (value: string) => {
    setLocalCommand(value);
    updateNodeInput(
      nodeId,
      "commandName",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleCommandChange = (value: string) => {
    setLocalCommand(value);
    debouncedOnChange(value);
  };

  return (
    <div className={cn("p-2 space-y-1", className)}>
      <Select
        value={discordBotId || ""}
        onValueChange={handleBotChange}
        disabled={disabled || isDiscordBotsLoading}
      >
        <SelectTrigger className="h-6 text-xs">
          <SelectValue
            placeholder={isDiscordBotsLoading ? "Loading..." : "Select a bot"}
          />
        </SelectTrigger>
        <SelectContent>
          {discordBots.map((bot) => (
            <SelectItem key={bot.id} value={bot.id}>
              {bot.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW_SENTINEL}>+ New Bot</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={localCommand}
        onChange={(e) => handleCommandChange(e.target.value)}
        placeholder="command"
        disabled={disabled}
        className="h-6 text-xs px-1.5 font-mono"
      />
      <DiscordBotCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleBotCreated}
        onCommandNameSet={handleCommandNameSet}
      />
    </div>
  );
}

export const discordTriggerInputWidget = createWidget({
  component: DiscordTriggerInputWidget,
  nodeTypes: ["receive-discord-message"],
  inputField: "commandName",
  managedFields: ["discordBotId"],
  extractConfig: (nodeId, inputs) => ({
    nodeId,
    discordBotId: getInputValue(inputs, "discordBotId", ""),
    commandName: getInputValue(inputs, "commandName", ""),
    inputs,
  }),
});
