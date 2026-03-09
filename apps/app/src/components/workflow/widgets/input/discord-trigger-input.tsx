import { ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  syncDiscordTrigger,
  useDiscordBots,
  useDiscordTrigger,
} from "@/services/discord-bot-service";
import { cn } from "@/utils/utils";
import { updateNodeInput, useWorkflow } from "../../workflow-context";
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
  const [isSyncing, setIsSyncing] = useState(false);

  const { id: workflowIdOrHandle } = useParams<{ id: string }>();
  const { organization } = useAuth();
  const orgHandle = organization?.handle ?? "";
  const { discordTrigger, mutateDiscordTrigger } = useDiscordTrigger(
    workflowIdOrHandle ?? null
  );

  const selectedBot = discordBots.find((b) => b.id === discordBotId);
  const inviteUrl = selectedBot
    ? `https://discord.com/oauth2/authorize?client_id=${selectedBot.applicationId}&scope=bot+applications.commands&permissions=2048`
    : null;

  const isOutOfSync =
    discordTrigger &&
    localCommand &&
    discordTrigger.commandName !== localCommand;

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

  const handleSync = async () => {
    if (!workflowIdOrHandle || !orgHandle) return;
    setIsSyncing(true);
    try {
      await syncDiscordTrigger(workflowIdOrHandle, orgHandle);
      await mutateDiscordTrigger();
      toast.success("Slash command synced with Discord");
    } catch {
      toast.error("Failed to sync slash command");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={cn("p-2 space-y-1", className)}>
      <div className="flex items-center gap-1">
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
        {inviteUrl && (
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Invite bot to server"
            className="inline-flex items-center justify-center h-6 w-6 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Input
          value={localCommand}
          onChange={(e) => handleCommandChange(e.target.value)}
          placeholder="command"
          disabled={disabled}
          className={cn(
            "h-6 text-xs px-1.5 font-mono",
            isOutOfSync && "border-amber-500"
          )}
        />
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 shrink-0",
            isOutOfSync && "text-amber-500 hover:text-amber-600"
          )}
          disabled={disabled || isSyncing || !localCommand}
          onClick={handleSync}
          title={
            isOutOfSync
              ? "Command not synced with Discord — click to sync"
              : "Sync slash command with Discord"
          }
        >
          {isOutOfSync ? (
            <TriangleAlert className="h-3 w-3" />
          ) : (
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          )}
        </Button>
      </div>
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
