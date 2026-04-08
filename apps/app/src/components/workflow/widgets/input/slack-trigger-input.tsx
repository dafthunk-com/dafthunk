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
import { useSlackBots } from "@/services/bot-service";
import { cn } from "@/utils/utils";
import { updateNodeInput, useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue, useDebouncedChange } from "../widget";
import { SlackBotCreateDialog } from "./slack-bot-create-dialog";

const CREATE_NEW_SENTINEL = "__create_new__";

interface SlackTriggerInputProps extends BaseWidgetProps {
  nodeId: string;
  slackBotId: string;
  channelId: string;
  inputs: WorkflowParameter[];
}

function SlackTriggerInputWidget({
  nodeId,
  slackBotId,
  channelId,
  inputs,
  className,
  disabled = false,
}: SlackTriggerInputProps) {
  const { slackBots, isSlackBotsLoading, mutateSlackBots } = useSlackBots();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const [localChannelId, setLocalChannelId] = useState(channelId ?? "");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { debouncedOnChange } = useDebouncedChange((value) => {
    updateNodeInput(
      nodeId,
      "channelId",
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
      "slackBotId",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleBotCreated = async (botId: string) => {
    await mutateSlackBots?.();
    updateNodeInput(
      nodeId,
      "slackBotId",
      botId,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
    setIsCreateDialogOpen(false);
  };

  const handleChannelIdChange = (value: string) => {
    setLocalChannelId(value);
    debouncedOnChange(value);
  };

  return (
    <div className={cn("p-2 space-y-1", className)}>
      <Select
        value={slackBotId || ""}
        onValueChange={handleBotChange}
        disabled={disabled || isSlackBotsLoading}
      >
        <SelectTrigger className="h-6 text-xs">
          <SelectValue
            placeholder={isSlackBotsLoading ? "Loading..." : "Select a bot"}
          />
        </SelectTrigger>
        <SelectContent>
          {slackBots.map((bot) => (
            <SelectItem key={bot.id} value={bot.id}>
              {bot.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW_SENTINEL}>+ New Bot</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={localChannelId}
        onChange={(e) => handleChannelIdChange(e.target.value)}
        placeholder="Channel ID (optional)"
        disabled={disabled}
        className="h-6 text-xs px-1.5 font-mono"
      />
      <SlackBotCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleBotCreated}
      />
    </div>
  );
}

export const slackTriggerInputWidget = createWidget({
  component: SlackTriggerInputWidget,
  nodeTypes: ["receive-slack-message"],
  inputField: "slackBotId",
  managedFields: ["channelId"],
  extractConfig: (nodeId, inputs) => ({
    nodeId,
    slackBotId: getInputValue(inputs, "slackBotId", ""),
    channelId: getInputValue(inputs, "channelId", ""),
    inputs,
  }),
});
